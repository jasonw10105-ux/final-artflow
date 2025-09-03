// src/components/dashboard/ArtworkForm.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Import directly exported Row types and JSONB types from database.types.ts
import { Database, ArtworkRow, ArtworkImageRow, ProfileRow, CatalogueRow, DimensionsJson, DateInfoJson, SignatureInfoJson, FramingInfoJson, EditionInfoJson, HistoricalEntryJson } from '@/types/database.types';
import { AppArtwork, AppProfile, AppArtworkImage, AppCatalogue } from '@/types/app-specific.types'; // Import application-specific types

import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import ColorThief from 'colorthief'; // Client-side dominant color extraction

// D&D imports
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// MUI Button Group and Toggle imports
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Box from '@mui/material/Box'; // For Autocomplete rendering

// Client-side image generation loading
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

// Custom components/helpers
import { mediaTaxonomy } from '@/lib/mediaTaxonomy';
import { getMediaTypes, getMediaSubtypes } from '@/lib/mediaHelpers';
import SortableImage from './SortableImage';
import ImageDropzone from './ImageDropzone';
import TagManager, { Tag } from './TagManager';


// ---------------------------------------------------
// 1. Type Definitions (Matching Supabase Schema + Relations)
// ---------------------------------------------------

type ArtworkStatus = ArtworkRow['status'];
type Condition = ArtworkRow['condition'];
type Rarity = ArtworkRow['rarity'];
type FramingStatus = ArtworkRow['framing_status'];

// Re-using Database types for JSONB structures
type HistoricalEntry = HistoricalEntryJson;

// Extend ArtworkRow with joined relations
type Artwork = AppArtwork;

type Catalogue = AppCatalogue;

// ArtworkImage type derived directly from Database
type ArtworkImage = AppArtworkImage;

type PricingModel = 'fixed' | 'negotiable' | 'on_request';

// Re-using Database types for nested JSONB structures
type Dimensions = DimensionsJson;
type FramingInfo = FramingInfoJson;
type SignatureInfo = SignatureInfoJson;
type EditionInfo = EditionInfoJson;
type DateInfo = DateInfoJson;


interface ArtworkFormProps {
  artworkId?: string;
  formId?: string;
  onSaveSuccess?: (artworkId: string) => void;
  onTitleChange?: (newTitle: string) => void;
}


// ---------------------------------------------------
// 2. Helper Functions (Moved to top level of component file for consistent access)
// ---------------------------------------------------

// Updated fetchArtworkAndCatalogues to return AppArtwork and AppProfile
const fetchArtworkAndCatalogues = async (artworkId: string, userId: string) => {
  const { data: artworkData, error: artworkError } = await supabase
    .from('artworks')
    .select('*, artist:profiles!user_id(id, full_name, slug)') // Select all profile fields needed for AppProfile
    .eq('id', artworkId)
    .single();

  if (artworkError) throw new Error(`Artwork not found: ${artworkError.message}`);
  if (!artworkData) throw new Error(`Artwork with ID ${artworkId} not found.`);

  const { data: allUserCatalogues, error: allCatError } = await supabase
    .from('catalogues')
    .select('*, artist:profiles!user_id(id, full_name, slug)') // Select artist for catalogue
    .eq('user_id', userId);
  if (allCatError) throw new Error(`Could not fetch catalogues: ${allCatError.message}`);

  const { data: assignedJunctions, error: junctionError } = await supabase
    .from('artwork_catalogue_junction')
    .select('catalogue_id')
    .eq('artwork_id', artworkId);
  if (junctionError) throw new Error(`Could not fetch assignments: ${junctionError.message}`);

  const assignedCatalogueIds = new Set(assignedJunctions.map((j) => j.catalogue_id));
  // Filter and cast to AppCatalogue
  const assignedCatalogues = (allUserCatalogues || []).filter((cat) => assignedCatalogueIds.has(cat.id)) as AppCatalogue[];

  // Also fetch all artwork_images for this artwork
  const { data: imgData, error: imgError } = await supabase
    .from('artwork_images')
    .select('*') // Fetch all fields for ArtworkImage including generated URLs
    .eq('artwork_id', artworkId)
    .order('position', { ascending: true });
  if (imgError) console.error("Error fetching artwork images:", imgError);

  return {
    artworkData: artworkData as AppArtwork, // Cast to AppArtwork
    allUserCatalogues: (allUserCatalogues || []) as AppCatalogue[], // Cast to AppCatalogue[]
    assignedCatalogues,
    imgData: (imgData || []) as AppArtworkImage[] // Cast to AppArtworkImage[]
  };
};

const updateSaleStatus = async ({ artworkId, identifier, isSold }: { artworkId: string, identifier: string, isSold: boolean }) => {
  const { error } = await supabase.rpc('update_artwork_edition_sale', {
    p_artwork_id: artworkId,
    p_edition_identifier: identifier,
    p_is_sold: isSold,
  });
  if (error) throw error;
};

const haveDimensionsChanged = (oldDim: Dimensions | null | undefined, newDim: Dimensions | null | undefined): boolean => {
  // Deep compare dimensions, considering nulls and defaults
  if (!oldDim && !newDim) return false;
  if (!oldDim || !newDim) return true; // One is null/undefined and the other isn't
  return oldDim.width !== newDim.width || oldDim.height !== newDim.height || oldDim.depth !== newDim.depth || oldDim.unit !== newDim.unit;
};

// Deep update utility for nested fields
const updateNestedState = <T extends object>(prevState: T, path: string, value: any): T => {
  const keys = path.split('.');
  const newState = { ...prevState };
  let current: any = newState;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object' || Array.isArray(current[key])) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return newState;
};


// ---------------------------------------------------
// 3. Custom Hook: useEditionManagement (Internal to this file)
// ---------------------------------------------------
const useEditionManagement = (artwork: Partial<Artwork>, artworkId: string) => {
  const queryClient = useQueryClient();

  const saleMutation = useMutation({
    mutationFn: updateSaleStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artwork-editor-data', artworkId] });
      queryClient.invalidateQueries({ queryKey: ['artworks'] });
    },
    onError: (error: any) => {
      toast.error(`Error updating edition sale: ${error.message}`);
    },
  });

  const allEditions = useMemo(() => {
    // Editions are only relevant for 'limited_edition' rarity
    if (artwork.rarity !== 'limited_edition' || !artwork.edition_info?.is_edition) return [];
    
    const editionInfo = artwork.edition_info;
    const editions: string[] = [];
    const numericSize = editionInfo.numeric_size || 0;
    const apSize = editionInfo.ap_size || 0;

    for (let i = 1; i <= numericSize; i++) editions.push(`${i}/${numericSize}`);
    for (let i = 1; i <= apSize; i++) editions.push(`AP ${i}/${apSize}`);
    return editions;
  }, [artwork.rarity, artwork.edition_info?.is_edition, artwork.edition_info?.numeric_size, artwork.edition_info?.ap_size]);

  const handleEditionSaleChange = (identifier: string, isChecked: boolean) => {
    saleMutation.mutate({ artworkId, identifier, isSold: isChecked });
  };

  return { saleMutation, handleEditionSaleChange, allEditions };
};

// ---------------------------------------------------
// 4. Client-Side Image Processing Helpers
// ---------------------------------------------------
// --- CONFIGURE THESE URLs ---
// You must host these files publicly (e.g., in your Supabase Storage and make them public)
const ROOM_SCENE_BACKGROUND_IMAGE_URL = 'https://s.mj.run/L8-GjT_F_0E'; // Replace with your hosted room scene image URL
const WATERMARK_FONT_URL = 'https://fonts.cdnfonts.com/s/43472/Montserrat-Regular.woff'; // A publicly accessible font URL (e.g., from Google Fonts CDN)

// Constants for visualization scaling (adjust these based on your room scene image)
// You need to measure a known object in your ROOM_SCENE_BACKGROUND_IMAGE_URL
// For example, if there's a 1.5 meter wide bench in your image, and it appears 500 pixels wide:
const BENCH_REAL_WIDTH_M = 1.5; // Example: 1.5 meters wide
const BENCH_PIXEL_WIDTH = 500; // Example: that bench is 500 pixels wide in ROOM_SCENE_BACKGROUND_IMAGE_URL
const ARTWORK_TARGET_WALL_POS = { x: 0.5, y: 0.4 }; // Percentage of room scene width/height to center artwork

// Fetches image as a Blob for Canvas operations (Cross-Origin compatible)
async function fetchImageAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url, { mode: 'cors' }); // Ensure CORS mode
  if (!response.ok) throw new Error(`Failed to fetch image: ${url} - ${response.statusText}`);
  return response.blob();
}

// Converts Blob to ImageBitmap for drawing to canvas
async function blobToImageBitmap(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob);
}

// Uploads a File/Blob to Supabase Storage and returns its public URL
async function uploadFileToSupabaseStorage(
  supabaseClient: ReturnType<typeof createClient>,
  bucket: string,
  path: string,
  file: File | Blob,
  contentType: string = 'image/webp'
): Promise<string> {
  const { data: uploadData, error: uploadErr } = await supabaseClient.storage
    .from(bucket)
    .upload(path, file, {
      contentType: contentType,
      upsert: true,
      cacheControl: '3600'
    });

  if (uploadErr) throw uploadErr;

  const { data: publicUrlData } = supabaseClient.storage.from(bucket).getPublicUrl(uploadData.path);
  return publicUrlData.publicUrl;
}

// Generates Dominant Colors (Client-Side)
const extractDominantColor = async (imageUrl: string): Promise<string[] | null> => {
  try {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Required for cross-origin images to prevent tainted canvas
    img.src = imageUrl;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
    });

    const colorThief = new ColorThief();
    const dominantColorRGB = colorThief.getColor(img);
    const toHex = (c: number) => ('0' + c.toString(16)).slice(-2);
    return [`#${toHex(dominantColorRGB[0])}${toHex(dominantColorRGB[1])}${toHex(dominantColorRGB[2])}`];
  } catch (error) {
    console.error("Error extracting dominant color with ColorThief:", error);
    return null;
  }
};

// Generates Watermark (Client-Side)
async function generateWatermark(
  primaryImageUrl: string,
  artworkTitle: string,
  artistFullName: string,
  fontUrl: string
): Promise<File | null> {
  try {
    const [imgBlob, fontResponse] = await Promise.all([
      fetchImageAsBlob(primaryImageUrl),
      fetch(fontUrl, { mode: 'cors' }),
    ]);

    if (!fontResponse.ok) throw new Error(`Failed to fetch font: ${fontResponse.statusText} from ${fontUrl}`);
    const fontBlob = await fontResponse.blob();

    // Create a temporary style for the font to be loaded by the browser
    const fontFace = new FontFace('WatermarkFont', fontBlob);
    await fontFace.load();
    document.fonts.add(fontFace);

    const imgBitmap = await blobToImageBitmap(imgBlob);

    const canvas = document.createElement('canvas');
    canvas.width = imgBitmap.width;
    canvas.height = imgBitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(imgBitmap, 0, 0);

    // Watermark text properties - use loaded font
    const fontSize = Math.max(16, Math.min(canvas.width / 25, canvas.height / 25)); // Responsive font size
    ctx.font = `${fontSize}px WatermarkFont, Arial, sans-serif`; // Use loaded font, with fallback
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; // White, semi-transparent
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    const padding = fontSize * 0.75;

    ctx.fillText(`${artworkTitle} by ${artistFullName}`, canvas.width - padding, canvas.height - padding);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], `watermark-${uuidv4()}.webp`, { type: 'image/webp' }));
        } else {
          resolve(null);
        }
      }, 'image/webp', 0.8); // WebP for good compression
    });
  } catch (error) {
    console.error("Error generating watermark:", error);
    return null;
  }
}

// Generates Visualization (Client-Side)
async function generateVisualization(
  primaryImageUrl: string,
  artworkWidthCm: number,
  artworkHeightCm: number,
  roomSceneBackgroundUrl: string,
  realBenchWidthM: number,
  benchPixelWidth: number,
  targetWallPosition: { x: number; y: number }
): Promise<File | null> {
  try {
    const [artworkBlob, roomSceneBlob] = await Promise.all([
      fetchImageAsBlob(primaryImageUrl),
      fetchImageAsBlob(roomSceneBackgroundUrl),
    ]);

    const [artworkBitmap, roomSceneBitmap] = await Promise.all([
      blobToImageBitmap(artworkBlob),
      blobToImageBitmap(roomSceneBlob),
    ]);

    const canvas = document.createElement('canvas');
    canvas.width = roomSceneBitmap.width;
    canvas.height = roomSceneBitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(roomSceneBitmap, 0, 0);

    // Calculate scaling
    const pixelsPerMeter = benchPixelWidth / realBenchWidthM;
    const targetArtworkWidthPx = (artworkWidthCm / 100) * pixelsPerMeter;
    const targetArtworkHeightPx = (artworkHeightCm / 100) * pixelsPerMeter;

    if (targetArtworkWidthPx <= 0 || targetArtworkHeightPx <= 0) {
      console.warn("Invalid artwork dimensions for visualization. Skipping.");
      return null;
    }

    // Resize artwork for placement (ImageBitmap has resize options)
    const scaledArtwork = await createImageBitmap(artworkBitmap, {
        resizeWidth: targetArtworkWidthPx,
        resizeHeight: targetArtworkHeightPx,
        resizeQuality: 'high',
    });

    // Position the artwork on the 'wall'
    const posX = (canvas.width * targetWallPosition.x) - (scaledArtwork.width / 2);
    const posY = (canvas.height * targetWallPosition.y) - (scaledArtwork.height / 2);

    ctx.drawImage(scaledArtwork, posX, posY);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], `visualization-${uuidv4()}.webp`, { type: 'image/webp' }));
        } else {
          resolve(null);
        }
      }, 'image/webp', 0.8);
    });
  } catch (error) {
    console.error("Error generating visualization:", error);
    return null;
  }
}

// ---------------------------------------------------
// 5. Reusable SortableItem component for Exhibitions/Literature
// ---------------------------------------------------
interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.8 : 1,
    background: 'var(--card)',
    padding: '1rem',
    borderRadius: 'var(--radius)',
    marginBottom: '0.5rem',
    boxShadow: isDragging ? '0px 4px 10px rgba(0, 0, 0, 0.1)' : 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};


// ---------------------------------------------------
// 6. HistoricalEntryCard (For Exhibitions and Literature)
// ---------------------------------------------------
interface HistoricalEntryCardProps {
  entry: HistoricalEntry;
  index: number;
  onUpdate: (index: number, field: keyof HistoricalEntry, value: any) => void;
  onRemove: (id: string) => void;
}

const HistoricalEntryCard: React.FC<HistoricalEntryCardProps> = ({ entry, index, onUpdate, onRemove }) => {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', marginBottom: '0.5rem' }}>
      <TextField
        label="Year"
        type="number"
        value={entry.year ?? ''}
        onChange={(e) => onUpdate(index, 'year', parseFloat(e.target.value) || null)}
        style={{ flex: 0.3 }}
        margin="dense"
      />
      <TextField
        label="Description"
        multiline
        rows={2}
        value={entry.description}
        onChange={(e) => onUpdate(index, 'description', e.target.value)}
        style={{ flex: 0.7 }}
        margin="dense"
      />
      <button type="button" onClick={() => onRemove(entry.id)} className="button button-danger-text" style={{ alignSelf: 'center', flexShrink: 0 }}>
        Remove
      </button>
    </div>
  );
};


// ---------------------------------------------------
// 7. Main Component: ArtworkForm (Handles all creation/editing)
// ---------------------------------------------------
const ArtworkForm: React.FC<ArtworkFormProps> = ({ artworkId, formId, onSaveSuccess, onTitleChange }) => {
  const { user, profile } = useAuth(); // Assuming profile contains default_has_certificate_of_authenticity
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // -------------------- State Management (All hooks at top-level) --------------------
  const [artwork, setArtwork] = useState<Partial<AppArtwork>>({});
  const [artistFullName, setArtistFullName] = useState<string>(''); // Explicit state for artist name
  const [originalTitle, setOriginalTitle] = useState('');
  const [allCatalogues, setAllCatalogues] = useState<AppCatalogue[]>([]);
  const [selectedCatalogues, setSelectedCatalogues] = useState<AppCatalogue[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [images, setImages] = useState<AppArtworkImage[]>([]); // All images for the artwork
  const [primaryArtworkImage, setPrimaryArtworkImage] = useState<AppArtworkImage | null>(null); // The actual primary image object

  // Loading states for client-side image processing
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingNewImage, setIsUploadingNewImage] = useState(false);
  const [isReplacingExistingImage, setIsReplacingExistingImage] = useState<string | null>(null); // Stores ID of image being replaced
  const [isProcessingImagesClientSide, setIsProcessingImagesClientSide] = useState(false); // New loading state

  // State for Autocomplete values, derived from artwork.medium
  const [selectedPrimaryMediumCategory, setSelectedPrimaryMediumCategory] = useState<string | null>(null);
  const [selectedSecondaryMediumType, setSelectedSecondaryMediumType] = useState<string | null>(null);

  // Form validation/touch state
  const [touched, setTouched] = useState<{
    title: boolean; description: boolean; price: boolean; images: boolean; medium: boolean; date_info: { type: boolean, date_value: boolean, start_date: boolean, end_date: boolean };
    dimensions: { width: boolean; height: boolean; depth: boolean; unit: boolean };
    framing_info: { details: boolean }; // Framing details validation
    signature_info: { is_signed: boolean; location: boolean };
    edition_info: { numeric_size: boolean; ap_size: boolean };
    status: boolean;
    has_certificate_of_authenticity: boolean;
    certificate_of_authenticity_details: boolean;
    condition: boolean;
    condition_notes: boolean;
    rarity: boolean;
    framing_status: boolean;
    genre: boolean; // Add genre to touched state
    subject: boolean; // Add subject to touched state
    orientation: boolean; // Add orientation to touched state
    [key: string]: any;
  }>({
    title: false, description: false, price: false, images: false, medium: false,
    date_info: { type: false, date_value: false, start_date: false, end_date: false },
    dimensions: { width: false, height: false, depth: false, unit: false },
    framing_info: { details: false },
    signature_info: { is_signed: false, location: false },
    edition_info: { numeric_size: false, ap_size: false },
    status: false,
    has_certificate_of_authenticity: false,
    certificate_of_authenticity_details: false,
    condition: false,
    condition_notes: false,
    rarity: false,
    framing_status: false,
    genre: false, subject: false, orientation: false,
  });

  const dndSensors = useSensors(useSensor(PointerSensor));


  // -------------------- Backend Interaction: Orchestrator Trigger --------------------
  // This function sends metadata to the backend for storage (dominant_colors, genre, subject, orientation, keywords)
  const triggerMetadataUpdateBackend = useCallback(async (
    artworkId: string,
    payload: {
      dominant_colors?: string[] | null;
      genre?: string | null;
      subject?: string | null;
      orientation?: string | null;
      keywords_from_image?: string[] | null; // Keywords derived from image (if client-side AI)
    } = {}
  ) => {
    try {
      console.log(`[${artworkId}] Triggering backend image generation for metadata storage.`);
      const { error } = await supabase.functions.invoke('generate-images', {
        body: {
          artworkId, // Required
          dominant_colors: payload.dominant_colors,
          genre: payload.genre,
          subject: payload.subject,
          orientation: payload.orientation,
          keywords_from_image: payload.keywords_from_image,
        },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['artwork-editor-data', artworkId] }); // Re-fetch to get updated artwork data
      toast.success("Artwork metadata updated.");
    } catch (err) {
      console.error('Backend metadata update failed:', (err as Error).message);
      toast.error('Failed to update artwork metadata: ' + (err as Error).message);
    }
  }, [supabase.functions, queryClient]);


  // -------------------- Client-side Image Processing (Dominant Colors, Watermark, Visualization) --------------------
  const collectImageMetadataAndGenerateImages = useCallback(async (
    currentPrimaryImage: AppArtworkImage,
    currentArtworkData: Partial<AppArtwork>, // Data from the form (potentially unsaved)
    currentArtistFullName: string,
    force: boolean = false
  ) => {
    if (!currentPrimaryImage?.image_url || !artworkId || artworkId === 'new-artwork-temp-id') {
      console.warn("No primary image URL or artworkId for client-side processing.");
      return;
    }
    setIsProcessingImagesClientSide(true);
    let latestDominantColors: string[] | null = currentArtworkData.dominant_colors || null;

    try {
      const imageUpdatePayload: Partial<AppArtworkImage> = {};
      let shouldUpdateArtworkImageRecord = false;
      let shouldTriggerBackendMetadataUpdate = false;

      // --- 1. Dominant Colors (Client-side via ColorThief) ---
      // Only run if not already set on artwork or force is true
      if (force || !currentArtworkData.dominant_colors || currentArtworkData.dominant_colors.length === 0) {
        console.log("Extracting dominant colors...");
        const dominantColors = await extractDominantColor(currentPrimaryImage.image_url);
        if (dominantColors && JSON.stringify(dominantColors) !== JSON.stringify(currentArtworkData.dominant_colors)) {
          latestDominantColors = dominantColors; // Update local variable for backend payload
          shouldTriggerBackendMetadataUpdate = true;
        }
      }

      // --- 2. Watermark (Client-side via Canvas) ---
      // Re-generate if force, or URL is null, or primary image URL changes, or artwork title/artist name changes
      const currentWatermarkText = `${currentArtworkData.title || ''} by ${currentArtistFullName}`;
      const needsWatermark = force || !currentPrimaryImage.watermarked_image_url ||
                             (currentPrimaryImage.watermarked_image_url && !currentPrimaryImage.watermarked_image_url.includes(encodeURIComponent(currentWatermarkText.toLowerCase().replace(/\s/g, '_')))) ||
                             (currentArtworkData.title !== artwork.title) || (currentArtistFullName !== artistFullName); // Compare against current form state/local artist name

      if (needsWatermark) {
        console.log("Generating watermark...");
        const watermarkedFile = await generateWatermark(currentPrimaryImage.image_url, currentArtworkData.title || 'Untitled', currentArtistFullName, WATERMARK_FONT_URL);
        if (watermarkedFile) {
          const path = `${artworkId}/watermarked/${uuidv4()}-${watermarkedFile.name}`;
          const publicUrl = await uploadFileToSupabaseStorage(supabase, 'artworks', path, watermarkedFile, 'image/webp');
          if (publicUrl !== currentPrimaryImage.watermarked_image_url) {
            imageUpdatePayload.watermarked_image_url = publicUrl;
            shouldUpdateArtworkImageRecord = true;
          }
        }
      }

      // --- 3. Visualization (Client-side via Canvas) ---
      // Re-generate if force, or URL is null, or primary image URL changes, or artwork dimensions change
      const needsVisualization = force || !currentPrimaryImage.visualization_image_url ||
                                 haveDimensionsChanged(currentArtworkData.dimensions, artwork.dimensions) || // Compare against current form state dimensions
                                 (currentPrimaryImage.image_url !== artwork.primary_image_url); // Compare against current artwork's primary_image_url

      if (needsVisualization && artwork.dimensions?.width && artwork.dimensions?.height && artwork.dimensions.width > 0 && artwork.dimensions.height > 0) {
        console.log("Generating visualization...");
        const visualizationFile = await generateVisualization(
          currentPrimaryImage.image_url,
          artwork.dimensions.width, // Use current form state dimensions
          artwork.dimensions.height, // Use current form state dimensions
          ROOM_SCENE_BACKGROUND_IMAGE_URL,
          BENCH_REAL_WIDTH_M,
          BENCH_PIXEL_WIDTH,
          ARTWORK_TARGET_WALL_POS
        );
        if (visualizationFile) {
          const path = `${artworkId}/visualization/${uuidv4()}-${visualizationFile.name}`;
          const publicUrl = await uploadFileToSupabaseStorage(supabase, 'artworks', path, visualizationFile, 'image/webp');
          if (publicUrl !== currentPrimaryImage.visualization_image_url) {
            imageUpdatePayload.visualization_image_url = publicUrl;
            shouldUpdateArtworkImageRecord = true;
          }
        }
      }

      // Update the primary artwork_images record directly if anything changed
      if (shouldUpdateArtworkImageRecord) {
        const { error: updateImgErr } = await supabase.from('artwork_images').update(imageUpdatePayload).eq('id', currentPrimaryImage.id);
        if (updateImgErr) throw updateImgErr;
        queryClient.invalidateQueries({ queryKey: ['artwork-editor-data', artworkId] }); // Re-fetch images to update UI
      }

    } catch (error: any) {
      console.error("Client-side image processing failed:", error);
      toast.error("Failed to generate some images: " + error.message);
    } finally {
      setIsProcessingImagesClientSide(false);
      // Always trigger backend to save dominant colors and other metadata that's part of 'artworks' table
      // This ensures 'dominant_colors' (derived here) is saved, and 'genre', 'subject', 'orientation' (manual input) are saved.
      if (shouldTriggerBackendMetadataUpdate || latestDominantColors !== currentArtworkData.dominant_colors) { // Trigger only if dominant colors changed or some other backend metadata should update
          triggerMetadataUpdateBackend(artworkId, {
              dominant_colors: latestDominantColors,
              genre: currentArtworkData.genre, // Use the current form state for these
              subject: currentArtworkData.subject,
              orientation: currentArtworkData.orientation,
              keywords_from_image: currentArtworkData.keywords // Assuming client-side AI keywords (or empty)
          });
      }
    }
  }, [artworkId, queryClient, supabase, triggerMetadataUpdateBackend, artwork.dimensions, artwork.title, artistFullName, artwork.primary_image_url, artwork]);


  // -------------------- Data Fetching (useQuery) --------------------
  const { data, isLoading } = useQuery({
    queryKey: ['artwork-editor-data', artworkId],
    queryFn: async () => {
      if (!artworkId || artworkId === 'new-artwork-temp-id' || !user?.id) {
        return null;
      }
      const [{ data: artworkData, error: artworkError }, { data: profileData, error: profileError }] = await Promise.all([
        supabase.from('artworks').select('*, artist:profiles!user_id(id, full_name, slug)').eq('id', artworkId).single(), // Fetch artist profile for `AppArtwork`
        supabase.from('profiles').select('id, full_name, default_has_certificate_of_authenticity').eq('id', user.id).single() // Fetch artist's full_name (current user)
      ]);

      if (artworkError) throw new Error(`Artwork not found: ${artworkError.message}`);
      if (profileError) console.error("Error fetching user profile:", profileError);


      const { data: allUserCatalogues, error: allCatError } = await supabase
        .from('catalogues')
        .select('*, artist:profiles!user_id(id, full_name, slug)') // Fetch artist for catalogues
        .eq('user_id', user.id);
      if (allCatError) throw new Error(`Could not fetch catalogues: ${allCatError.message}`);

      const { data: assignedJunctions, error: junctionError } = await supabase
        .from('artwork_catalogue_junction')
        .select('catalogue_id')
        .eq('artwork_id', artworkId);
      if (junctionError) throw new Error(`Could not fetch assignments: ${junctionError.message}`);

      const assignedCatalogueIds = new Set(assignedJunctions.map((j) => j.catalogue_id));
      const assignedCatalogues = (allUserCatalogues || []).filter((cat) => assignedCatalogueIds.has(cat.id)) as AppCatalogue[];

      // Fetch all artwork_images for this artwork
      const { data: imgData, error: imgError } = await supabase
        .from('artwork_images')
        .select('*') // Fetch all fields for ArtworkImage including generated URLs
        .eq('artwork_id', artworkId)
        .order('position', { ascending: true });
      if (imgError) console.error("Error fetching artwork images:", imgError);

      return {
        artworkData: artworkData as AppArtwork, // Cast to AppArtwork
        allUserCatalogues: (allUserCatalogues || []) as AppCatalogue[], // Cast to AppCatalogue[]
        assignedCatalogues,
        profileData: profileData as AppProfile | null, // Cast to AppProfile
        imgData: (imgData || []) as AppArtworkImage[] // Cast to AppArtworkImage[]
      };
    },
    enabled: !!artworkId && artworkId !== 'new-artwork-temp-id' && !!user?.id,
    initialData: null,
  });


  // Effect to handle initial artwork data and image processing
  useEffect(() => {
    if (data?.artworkData) {
      const { artworkData, allUserCatalogues, assignedCatalogues, profileData } = data;

      setArtwork({
        ...artworkData,
        dimensions: artworkData.dimensions || { unit: 'cm' },
        framing_info: artworkData.framing_info || { details: null }, // Only keep details
        signature_info: artworkData.signature_info || { is_signed: false, location: null, details: null },
        edition_info: artworkData.edition_info || { is_edition: false, numeric_size: null, ap_size: null, sold_editions: [] },
        date_info: artworkData.date_info?.type ? artworkData.date_info : { type: 'year_only', date_value: new Date().getFullYear().toString() },
        has_certificate_of_authenticity: artworkData.has_certificate_of_authenticity ?? (profileData?.default_has_certificate_of_authenticity ?? false),
        condition: artworkData.condition || null,
        condition_notes: artworkData.condition_notes || null,
        rarity: artworkData.rarity || 'unique', // Default to unique if not set
        framing_status: artworkData.framing_status || 'unframed', // Default to unframed if not set
        primary_image_url: artworkData.primary_image_url, // From 'artworks' table
      });

      // Set artist full name for watermark generation
      setArtistFullName(artworkData.artist?.full_name || (profileData as AppProfile)?.full_name || 'Artist Unknown'); // Prioritize artwork's artist, then current user profile
      setOriginalTitle(artworkData.title || '');
      setAllCatalogues(allUserCatalogues);

      const systemCatalogue = allCatalogues.find((cat) => cat.is_system_catalogue);
      if (assignedCatalogues.length === 0 && systemCatalogue && artworkData.status === 'available') {
        setSelectedCatalogues([systemCatalogue]);
      } else {
        setSelectedCatalogues(assignedCatalogues);
      }

      setSelectedTags((artworkData.keywords || []).filter(k => k.trim() !== '').map(k => ({ id: k, name: k })));

      // Set images state from fetched data
      const fetchedImages = data?.imgData || [];
      setImages(fetchedImages);
      setPrimaryArtworkImage(fetchedImages.find(img => img.is_primary) || fetchedImages[0] || null);

    } else if (artworkId === 'new-artwork-temp-id') {
      setArtwork({
        dimensions: { unit: 'cm' },
        framing_info: { details: null },
        signature_info: { is_signed: false, location: null, details: null },
        edition_info: { is_edition: false, numeric_size: null, ap_size: null, sold_editions: [] },
        currency: 'ZAR',
        provenance: 'From the artist',
        status: 'pending',
        date_info: { type: 'year_only', date_value: new Date().getFullYear().toString() },
        title: '', description: '', price: null, genre: null, dominant_colors: null, keywords: null, orientation: null,
        inventory_number: null,
        private_note: null,
        provenance_notes: null,
        location: null,
        exhibitions: [],
        literature: [],
        subject: null,
        has_certificate_of_authenticity: (profile as AppProfile)?.default_has_certificate_of_authenticity ?? false,
        certificate_of_authenticity_details: null,
        condition: null,
        condition_notes: null,
        rarity: 'unique',
        framing_status: 'unframed',
        primary_image_url: null, // New artwork starts with no primary image
      });
      setArtistFullName((profile as AppProfile)?.full_name || 'Artist Unknown'); // Default artist name for new artwork
      setOriginalTitle('');
      setAllCatalogues(data?.allUserCatalogues || []);
      setSelectedCatalogues([]);
      setImages([]);
      setPrimaryArtworkImage(null);
      setSelectedTags([]);
      setSelectedPrimaryMediumCategory(null);
      setSelectedSecondaryMediumType(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, artworkId, user?.id, navigate, supabase, (profile as AppProfile)?.default_has_certificate_of_authenticity, (profile as AppProfile)?.full_name]);


  // UseEffect to parse artwork.medium into Autocomplete states when artwork.medium changes
  useEffect(() => {
    const mediumString = artwork.medium || '';
    let primaryMatch: string | null = null;
    let secondaryMatch: string | null = null;

    const parts = mediumString.split(': ').map(p => p.trim());
    if (parts.length > 0) {
      const potentialPrimary = parts[0];
      if (typeof mediaTaxonomy === 'object' && mediaTaxonomy !== null && Object.prototype.hasOwnProperty.call(mediaTaxonomy, potentialPrimary)) {
        primaryMatch = potentialPrimary;
        if (parts.length > 1) {
          const potentialSecondary = parts[1];
          const subtypes = primaryMatch ? getMediaSubtypes(primaryMatch) : [];
          if (subtypes.includes(potentialSecondary)) {
            secondaryMatch = potentialSecondary;
          }
        }
      }
    }

    setSelectedPrimaryMediumCategory(primaryMatch);
    setSelectedSecondaryMediumType(secondaryMatch);

  }, [artwork.medium]);

  // Ref to store previous values to detect changes for client-side image processing
  const prevPrimaryImageUrl = useRef<string | null>(null);
  const prevArtworkDimensions = useRef<Dimensions | null>(null);
  const prevArtworkTitle = useRef<string | null>(null);
  const prevArtistFullName = useRef<string | null>(null);

  // Effect to trigger client-side image processing when relevant data changes
  // This is the core trigger for watermarks and visualizations
  useEffect(() => {
    const currentPrimaryImgUrl = primaryArtworkImage?.image_url || null;
    const currentArtworkTitle = artwork.title || null;
    const currentArtistFullName = artistFullName || null; // Use local state
    const currentArtworkDimensions = artwork.dimensions || null;

    const primaryImageChanged = currentPrimaryImgUrl !== prevPrimaryImageUrl.current;
    const dimensionsChanged = haveDimensionsChanged(prevArtworkDimensions.current, currentArtworkDimensions);
    const titleOrArtistChanged = currentArtworkTitle !== prevArtworkTitle.current || currentArtistFullName !== prevArtistFullName.current;

    // Trigger conditions:
    // 1. Primary image changes
    // 2. Artwork dimensions change
    // 3. Artwork title or artist name changes
    // 4. On initial load IF primary image exists and generated images are missing
    const initialLoadWithMissingGeneratedImages = !!currentPrimaryImgUrl && artworkId !== 'new-artwork-temp-id' &&
                                                 (!primaryArtworkImage?.watermarked_image_url || !primaryArtworkImage?.visualization_image_url || !artwork.dominant_colors);

    if (primaryArtworkImage && artworkId && artworkId !== 'new-artwork-temp-id' &&
        (primaryImageChanged || dimensionsChanged || titleOrArtistChanged || initialLoadWithMissingGeneratedImages)) {
      console.log("Detected changes for client-side image processing. Triggering `collectImageMetadataAndGenerateImages`.");
      collectImageMetadataAndGenerateImages(primaryArtworkImage, artwork, currentArtistFullName || '', true); // Force re-generation if any trigger
    }

    // Update refs for next render
    prevPrimaryImageUrl.current = currentPrimaryImgUrl;
    prevArtworkDimensions.current = currentArtworkDimensions;
    prevArtworkTitle.current = currentArtworkTitle;
    prevArtistFullName.current = currentArtistFullName;
  }, [artwork.title, artwork.dimensions, primaryArtworkImage, artworkId, collectImageMetadataAndGenerateImages, artistFullName, artwork]);


  // -------------------- Derived Data --------------------
  const { saleMutation, handleEditionSaleChange, allEditions } = useEditionManagement(artwork, artworkId || '');

  const allMediaTypes = useMemo(() => getMediaTypes(), []);
  const secondaryMediumOptions = useMemo(() => getMediaSubtypes(selectedPrimaryMediumCategory || ''), [selectedPrimaryMediumCategory]);

  const pricingModel: PricingModel = useMemo(() => {
    if (artwork.is_price_negotiable) return 'negotiable';
    if (artwork.price != null && artwork.price > 0) return 'fixed';
    return 'on_request';
  }, [artwork.is_price_negotiable, artwork.price]);

  const userSelectableCatalogues = useMemo(() => allCatalogues.filter((cat) => !cat.is_system_catalogue), [allCatalogues]);

  const isFormValid = useMemo(() => {
    const isTitleValid = (artwork.title || '').trim().length > 0;
    const isPrimaryMediumValid = (artwork.medium || '').trim().length > 0;
    const isPriceValid = (pricingModel === 'on_request') || (artwork.price !== null && artwork.price! > 0);
    const isPrimaryImagePresent = images.length > 0;
    const isCreationDateValid = !!artwork.date_info?.type && (artwork.date_info.type === 'year_only' || artwork.date_info.type === 'full_date' || artwork.date_info.type === 'circa' ? !!artwork.date_info.date_value : (artwork.date_info.type === 'date_range' ? (!!artwork.date_info.start_date && !!artwork.date_info.end_date) : true));
    const areDimensionsValid = !(artwork.dimensions?.width === null || artwork.dimensions?.width === undefined || artwork.dimensions?.height === null || artwork.dimensions?.height === undefined);

    // Framing validation based on new framing_status
    const isFramingDetailsValid = !(artwork.framing_status === 'framed' && (artwork.framing_info?.details || '').trim().length === 0);

    const isSignatureValid = !(!!(artwork.signature_info?.is_signed) && (artwork.signature_info?.location || '').trim().length === 0);

    // Edition validation based on rarity
    const isEditionSizeValid = !(artwork.rarity === 'limited_edition' && (artwork.edition_info?.numeric_size === null || artwork.edition_info?.numeric_size === undefined || (artwork.edition_info?.numeric_size < 1)));
    const isAPsValid = !(artwork.rarity === 'limited_edition' && (artwork.edition_info?.ap_size === null || artwork.edition_info?.ap_size === undefined || (artwork.edition_info?.ap_size < 0)));


    const isStatusValid = !!artwork.status;
    const isCoADetailsValid = !(!!(artwork.has_certificate_of_authenticity) && (artwork.certificate_of_authenticity_details || '').trim().length === 0);
    // Genre, Subject, Orientation are no longer required for form validity, as they are manual or client-AI fields
    // and the backend will simply store what's provided. If you want to make them required, add checks here.

    return isTitleValid && isPrimaryMediumValid && isPriceValid && isPrimaryImagePresent && areDimensionsValid && isFramingDetailsValid && isSignatureValid && isEditionSizeValid && isAPsValid && isCreationDateValid && isStatusValid && isCoADetailsValid;
  }, [artwork, images.length, pricingModel]);


  // -------------------- Handlers --------------------

  const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

    setArtwork((prev: any) => {
      if (name.includes('.')) {
        let updatedValue: any = value;
        if (type === 'number') {
            updatedValue = parseFloat(value as string) || null;
        } else if (type === 'checkbox') {
            updatedValue = checked;
        }
        return updateNestedState(prev, name, updatedValue);
      } else {
        let updatedValue: any = value;
        if (type === 'number') {
            updatedValue = parseFloat(value as string) || null;
        } else if (type === 'checkbox') {
            updatedValue = checked;
        }
        return { ...prev, [name]: updatedValue };
      }
    });

    if (name === 'title' && onTitleChange) onTitleChange(value);
    setTouched((prev) => {
      if (name.includes('.')) {
        const keys = name.split('.');
        if (keys.length > 1) {
          if (keys[0] === 'date_info') {
            return { ...prev, [keys[0]]: { ...(prev[keys[0]] || {}), [keys[1]]: true } };
          }
          return { ...prev, [keys[0]]: { ...(prev[keys[0]] || {}), [keys[1]]: true } };
        }
      }
      return { ...prev, [name]: true };
    });
  }, [onTitleChange]);

  const handleFramingStatusChange = useCallback((
    event: React.MouseEvent<HTMLElement>,
    newStatus: FramingStatus | null,
  ) => {
    if (newStatus !== null) {
      setArtwork(prev => {
        let updatedArtwork = { ...prev, framing_status: newStatus };
        // Clear frame details if not 'framed'
        if (newStatus !== 'framed') {
          updatedArtwork = updateNestedState(updatedArtwork, 'framing_info.details', null);
        }
        return updatedArtwork;
      });
      setTouched(prev => ({ ...prev, framing_status: true }));
    }
  }, []);

  const handleSignedSwitchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setArtwork(prev => {
        let updatedArtwork = updateNestedState(prev, 'signature_info.is_signed', isChecked);
        if (!isChecked) {
            updatedArtwork = updateNestedState(updatedArtwork, 'signature_info.location', null);
            updatedArtwork = updateNestedState(updatedArtwork, 'signature_info.details', null);
        }
        return updatedArtwork;
    });
    setTouched(prev => ({ ...prev, signature_info: { ...prev.signature_info, is_signed: true } }));
  }, []);


  const handleStatusChange = useCallback((
    event: React.MouseEvent<HTMLElement>,
    newStatus: ArtworkStatus | null,
  ) => {
    if (newStatus !== null) {
      setArtwork(prev => ({ ...prev, status: newStatus }));
      setTouched(prev => ({ ...prev, status: true }));
    }
  }, []);

  const handleDateTypeChange = useCallback((
    event: React.MouseEvent<HTMLElement>,
    newDateType: DateInfo['type'] | null,
  ) => {
    if (newDateType !== null) {
      setArtwork(prev => ({
        ...prev,
        date_info: {
          ...prev.date_info,
          type: newDateType,
          date_value: (newDateType === 'year_only' || newDateType === 'circa') ? (new Date().getFullYear().toString()) : null,
          start_date: null,
          end_date: null,
        }
      }));
      setTouched(prev => ({ ...prev, date_info: { ...prev.date_info, type: true } }));
    }
  }, []);

  const handleRarityChange = useCallback((
    event: React.MouseEvent<HTMLElement>,
    newRarity: Rarity | null,
  ) => {
    if (newRarity !== null) {
      setArtwork(prev => {
        let updatedArtwork = { ...prev, rarity: newRarity };
        if (newRarity !== 'limited_edition') {
          // Reset edition specific fields if not limited edition
          updatedArtwork = updateNestedState(updatedArtwork, 'edition_info.is_edition', false);
          updatedArtwork = updateNestedState(updatedArtwork, 'edition_info.numeric_size', null);
          updatedArtwork = updateNestedState(updatedArtwork, 'edition_info.ap_size', null);
          updatedArtwork = updateNestedState(updatedArtwork, 'edition_info.sold_editions', []);
        } else {
          // Set is_edition to true and ensure default sizes if moving to limited edition
          updatedArtwork = updateNestedState(updatedArtwork, 'edition_info.is_edition', true);
          updatedArtwork = updateNestedState(updatedArtwork, 'edition_info.numeric_size', prev.edition_info?.numeric_size ?? 1);
          updatedArtwork = updateNestedState(updatedArtwork, 'edition_info.ap_size', prev.edition_info?.ap_size ?? 0);
        }
        return updatedArtwork;
      });
      setTouched(prev => ({ ...prev, rarity: true }));
    }
  }, []);


  const handleAddHistoricalEntry = useCallback((fieldName: 'exhibitions' | 'literature') => {
    setArtwork(prev => ({
      ...prev,
      [fieldName]: [...((prev[fieldName] as HistoricalEntry[]) || []), { id: uuidv4(), year: null, description: '' }],
    }));
  }, []);

  const handleUpdateHistoricalEntry = useCallback((
    fieldName: 'exhibitions' | 'literature',
    index: number,
    field: keyof HistoricalEntry,
    value: any
  ) => {
    setArtwork(prev => {
      const currentList = (prev[fieldName] as HistoricalEntry[]) || [];
      const updatedList = [...currentList];
      updatedList[index] = { ...updatedList[index], [field]: value };
      return { ...prev, [fieldName]: updatedList };
    });
  }, []);

  const handleRemoveHistoricalEntry = useCallback((
    fieldName: 'exhibitions' | 'literature',
    idToRemove: string
  ) => {
    setArtwork(prev => {
      const currentList = (prev[fieldName] as HistoricalEntry[]) || [];
      const updatedList = currentList.filter(entry => entry.id !== idToRemove);
      return { ...prev, [fieldName]: updatedList };
    });
  }, []);

  const handleDragEndHistoricalEntry = useCallback((
    fieldName: 'exhibitions' | 'literature',
    event: DragEndEvent
  ) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setArtwork(prev => {
      const currentList = prev[fieldName] as HistoricalEntry[];
      if (!currentList) return prev;
      const oldIndex = currentList.findIndex(entry => entry.id === active.id);
      const newIndex = currentList.findIndex(entry => entry.id === over.id);
      const reorderedList = arrayMove(currentList, oldIndex, newIndex);
      return { ...prev, [fieldName]: reorderedList };
    });
  }, []);


  // Handler for Primary Medium Category Autocomplete
  const handlePrimaryMediumCategoryChange = useCallback((newValue: string | null) => {
    setSelectedPrimaryMediumCategory(newValue);
    // Update artwork.medium directly based on Autocomplete selections
    setArtwork(prev => {
      const secondary = selectedSecondaryMediumType;
      const newMediumString = newValue ? (secondary ? `${newValue}: ${secondary}` : newValue) : (secondary ? secondary : '');
      return { ...prev, medium: newMediumString || '' };
    });
  }, [selectedSecondaryMediumType]);

  // Handler for Secondary Medium Type Autocomplete
  const handleSecondaryMediumTypeChange = useCallback((newValue: string | null) => {
    setSelectedSecondaryMediumType(newValue);
    // Update artwork.medium directly based on Autocomplete selections
    setArtwork(prev => {
      const primary = selectedPrimaryMediumCategory;
      const newMediumString = primary ? (newValue ? `${primary}: ${newValue}` : primary) : (newValue ? newValue : '');
      return { ...prev, medium: newMediumString || '' };
    });
  }, [selectedPrimaryMediumCategory]);

  // Handler for manual medium text field change (parses to update autocompletes)
  const handleManualMediumChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setArtwork(prev => ({ ...prev, medium: value }));
    setTouched((prev) => ({ ...prev, medium: true }));
  }, []);


  // Handler for image reordering (updates positions in DB)
  const handleImageDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setImages(prevImages => {
      const oldIndex = prevImages.findIndex(img => img.id === active.id);
      const newIndex = prevImages.findIndex(img => img.id === over.id);
      const reorderedImages = arrayMove(prevImages, oldIndex, newIndex);

      const finalOrder = reorderedImages.map((img, idx) => ({ ...img, position: idx, is_primary: idx === 0 }));

      finalOrder.forEach(async (img) => {
        await supabase.from('artwork_images').update({ position: img.position, is_primary: img.position === 0 }).eq('id', img.id);
      });

      // If the primary image changed (new first element), update artworks.primary_image_url
      if (artworkId && artworkId !== 'new-artwork-temp-id' && finalOrder.length > 0 && finalOrder[0].image_url !== artwork.primary_image_url) {
        supabase.from('artworks')
          .update({ primary_image_url: finalOrder[0].image_url })
          .eq('id', artworkId)
          .then(({ error }) => {
            if (error) console.error("Error updating artwork's primary_image_url:", error.message);
          });
        setArtwork(prev => ({ ...prev, primary_image_url: finalOrder[0].image_url })); // Update local artwork state
        setPrimaryArtworkImage(finalOrder[0]); // Update primary artwork image object
      }
      return finalOrder;
    });
    setTouched((prev) => ({ ...prev, images: true }));
  }, [artworkId, supabase, artwork.primary_image_url]);


  // Handler for deleting an image
  const handleDeleteImage = useCallback(async (id: string) => {
    if (!artworkId || artworkId === 'new-artwork-temp-id') {
      toast.error("Artwork not saved yet.");
      return;
    }
    if (images.length === 0) return;

    if (images[0]?.id === id && images.length > 1) {
      toast.error("Cannot delete the primary image directly. Set another image as primary first if you wish to remove this one.");
      return;
    }

    if (images.length === 1 && images[0]?.id === id) {
      if (!confirm("This is the last image. Deleting it will make the artwork invalid. Continue?")) return;
    }

    try {
      // Get the image_url before deleting to clean up storage if needed (optional)
      const imageToDelete = images.find(img => img.id === id);

      const { error } = await supabase.from('artwork_images').delete().eq('id', id);
      if (error) throw error;

      // Also delete from storage if desired (implement actual deletion logic for security/cleanup)
      // const filePath = imageToDelete?.image_url?.split('artworks/')[1];
      // if (filePath) { await supabase.storage.from('artworks').remove([filePath]); }

      setImages(prevImages => {
        const updatedImages = prevImages.filter(img => img.id !== id);
        const finalOrder = updatedImages.map((img, idx) => ({ ...img, position: idx, is_primary: idx === 0 }));

        // If the primary image was deleted, or the first image is now different, update artworks.primary_image_url
        const newPrimaryImageUrl = finalOrder.length > 0 ? finalOrder[0].image_url : null;
        if (newPrimaryImageUrl !== artwork.primary_image_url) {
          supabase.from('artworks')
            .update({ primary_image_url: newPrimaryImageUrl })
            .eq('id', artworkId)
            .then(({ error }) => {
              if (error) console.error("Error updating artwork's primary_image_url:", error.message);
            });
          setArtwork(prev => ({ ...prev, primary_image_url: newPrimaryImageUrl }));
          setPrimaryArtworkImage(finalOrder.length > 0 ? finalOrder[0] : null);
        }
        return finalOrder;
      });
      toast.success("Image deleted!");
    } catch (err: any) {
      console.error("Error deleting image:", err.message);
      toast.error(err.message || "Failed to delete image");
    }
    setTouched((prev) => ({ ...prev.images, images: true }));
  }, [images.length, images, artworkId, supabase, artwork.primary_image_url, artwork.title]);


  // Handler for replacing an image
  const handleReplaceImage = useCallback(async (id: string, file: File) => {
    if (!artworkId || artworkId === 'new-artwork-temp-id') {
      toast.error("Artwork not saved yet.");
      return;
    }
    setIsReplacingExistingImage(id); // Start loading indicator for this specific image
    try {
      const path = `${artworkId}/${uuidv4()}-${file.name}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage.from('artworks').upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: publicUrlData } = supabase.storage.from('artworks').getPublicUrl(path);

      // Update the artwork_images record
      const { error: updateErr } = await supabase.from('artwork_images').update({ image_url: publicUrlData.publicUrl }).eq('id', id);
      if (updateErr) throw updateErr;

      // Update local state and trigger client-side processing if this was the primary image
      setImages(prevImages => {
        const updatedImages = prevImages.map(img => img.id === id ? { ...img, image_url: publicUrlData.publicUrl } : img);
        const replacedImage = updatedImages.find(img => img.id === id);

        if (replacedImage?.is_primary) {
          supabase.from('artworks')
            .update({ primary_image_url: publicUrlData.publicUrl })
            .eq('id', artworkId)
            .then(({ error }) => {
              if (error) console.error("Error updating artwork's primary_image_url:", error.message);
            });
          setArtwork(prev => ({ ...prev, primary_image_url: publicUrlData.publicUrl }));
          setPrimaryArtworkImage(replacedImage); // Update primary artwork image object
        }
        return updatedImages;
      });
      toast.success("Image replaced!");
    } catch (err: any) {
      console.error("Error replacing image:", err.message);
      toast.error(err.message || "Failed to replace image");
    } finally {
        setIsReplacingExistingImage(null); // End loading indicator
    }
    setTouched((prev) => ({ ...prev.images, images: true }));
  }, [artworkId, supabase, artwork.primary_image_url]);


  // Handler for setting an image as primary
  const handleSetPrimary = useCallback(async (id: string) => {
    if (!artworkId || artworkId === 'new-artwork-temp-id') {
      toast.error("Artwork not saved yet.");
      return;
    }

    setImages(prevImages => {
      const newPrimaryCandidate = prevImages.find(img => img.id === id);
      if (!newPrimaryCandidate || newPrimaryCandidate.is_primary) return prevImages; // Already primary or not found

      const otherImages = prevImages.filter(img => img.id !== id);
      const newOrder = [newPrimaryCandidate, ...otherImages].map((img, idx) => ({ ...img, position: idx, is_primary: idx === 0 }));

      newOrder.forEach(async (img) => {
        await supabase.from('artwork_images').update({ position: img.position, is_primary: img.position === 0 }).eq('id', img.id);
      });

      // Update artworks.primary_image_url if it changed
      if (artworkId && artworkId !== 'new-artwork-temp-id' && newOrder.length > 0 && newOrder[0].image_url !== artwork.primary_image_url) {
        supabase.from('artworks')
          .update({ primary_image_url: newOrder[0].image_url })
          .eq('id', artworkId)
          .then(({ error }) => {
            if (error) console.error("Error updating artwork's primary_image_url:", error.message);
          });
        setArtwork(prev => ({ ...prev, primary_image_url: newOrder[0].image_url }));
        setPrimaryArtworkImage(newOrder[0]); // Update primary artwork image object
      }
      return newOrder;
    });
    setTouched((prev) => ({ ...prev.images, images: true }));
  }, [artworkId, supabase, artwork.primary_image_url]);

  // Handler for ImageDropzone's onUploadSuccess
  const handleDropzoneImageAdd = useCallback(async (newImage: ArtworkImage) => {
    setIsUploadingNewImage(true);
    setImages(prev => {
        const updatedImages = [...prev, newImage];
        // After adding, re-map to set positions and primary status
        const finalOrder = updatedImages.map((img, idx) => ({ ...img, position: idx, is_primary: idx === 0 }));
        return finalOrder; // return immediately for local state update
    });

    if (artworkId && artworkId !== 'new-artwork-temp-id' && newImage.image_url) {
        // If this is the very first image being added, also update artworks.primary_image_url
        if (images.length === 0) {
             supabase.from('artworks')
                .update({ primary_image_url: newImage.image_url })
                .eq('id', artworkId)
                .then(({ error }) => {
                    if (error) console.error("Error updating artwork's primary_image_url from dropzone:", error.message);
                });
            setArtwork(prev => ({ ...prev, primary_image_url: newImage.image_url }));
            setPrimaryArtworkImage(newImage); // This newly added image is now primary
        }
    }
    setIsUploadingNewImage(false);
  }, [artworkId, images.length, supabase]);


  const handleTagCreate = useCallback(async (tagName: string): Promise<Tag | null> => {
    try {
      if (!user?.id) throw new Error("User not authenticated for tag creation.");
      const { data: newTag, error } = await supabase.from('tags').insert({ name: tagName, user_id: user.id }).select('*').single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['allArtistTags'] });
      return { id: newTag.id, name: newTag.name };
    } catch (err: any) {
      console.error("Error creating tag:", err.message);
      toast.error(`Failed to create tag: ${err.message}`);
      return null;
    }
  }, [user?.id, queryClient]);


  const handlePricingModelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value as PricingModel;
    setArtwork((prev) => {
      const newArtwork = { ...prev };
      if (newModel === 'fixed') {
        newArtwork.is_price_negotiable = false;
        newArtwork.price = artwork.price ?? null;
        newArtwork.min_price = null;
        newArtwork.max_price = null;
      } else if (newModel === 'negotiable') {
        newArtwork.is_price_negotiable = true;
        newArtwork.price = artwork.price ?? null;
      } else if (newModel === 'on_request') {
        newArtwork.is_price_negotiable = false;
        newArtwork.price = null;
        newArtwork.min_price = null;
        newArtwork.max_price = null;
      }
      return newArtwork;
    });
    setTouched(prev => ({ ...prev, pricing_model: true }));
  }, [artwork.price]);


  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      toast.error("Please fill all required fields correctly.");
      setTouched(prev => ({
        ...prev,
        title: true, description: true, price: true, images: true, medium: true,
        date_info: {
            ...prev.date_info,
            type: true,
            date_value: artwork.date_info?.type !== 'date_range' && !artwork.date_info?.date_value,
            start_date: artwork.date_info?.type === 'date_range' && !artwork.date_info?.start_date,
            end_date: artwork.date_info?.type === 'date_range' && !artwork.date_info?.end_date,
        },
        status: true,
        dimensions: { ...prev.dimensions, width: true, height: true, unit: true },
        framing_info: {
          ...prev.framing_info,
          details: artwork.framing_status === 'framed' && (artwork.framing_info?.details || '').trim().length === 0,
        },
        signature_info: { ...prev.signature_info, location: Boolean(artwork.signature_info?.is_signed) && (artwork.signature_info?.location || '').trim().length === 0 },
        edition_info: {
            ...prev.edition_info,
            numeric_size: artwork.rarity === 'limited_edition' && (artwork.edition_info?.numeric_size === null || artwork.edition_info?.numeric_size === undefined || (artwork.edition_info?.numeric_size < 1)),
            ap_size: artwork.rarity === 'limited_edition' && (artwork.edition_info?.ap_size === null || artwork.edition_info?.ap_size === undefined || (artwork.edition_info?.ap_size < 0)),
        },
        has_certificate_of_authenticity: true,
        certificate_of_authenticity_details: Boolean(artwork.has_certificate_of_authenticity) && (artwork.certificate_of_authenticity_details || '').trim().length === 0,
        rarity: true,
        framing_status: true,
        genre: true, // Also validate genre if it's required
        subject: true, // Also validate subject if it's required
        orientation: true, // Also validate orientation if it's required
      }));
      return;
    }

    setIsSaving(true);
    try {
      const systemCatalogue = allCatalogues.find((cat) => cat.is_system_catalogue);
      const finalCatalogueSelection = new Set(selectedCatalogues.map((cat) => cat.id));
      if (systemCatalogue && artwork.status === 'available') finalCatalogueSelection.add(systemCatalogue.id);
      else if (systemCatalogue) finalCatalogueSelection.delete(systemCatalogue.id);

      const finalCatalogueIds = Array.from(finalCatalogueSelection);

      let artworkPayload: Partial<Artwork> = { ...artwork };

      artworkPayload.dimensions = { ...(artwork.dimensions || {}), unit: 'cm' };

      artworkPayload.framing_info = {
        is_framed: artwork.framing_status === 'framed',
        details: artwork.framing_status === 'framed' ? (artwork.framing_info?.details || null) : null,
        is_framing_optional: artwork.framing_status === 'frame_optional',
      };

      artworkPayload.signature_info = artwork.signature_info || { is_signed: false, location: null, details: null };

      artworkPayload.edition_info = {
        ...(artwork.edition_info || {}),
        is_edition: artwork.rarity === 'limited_edition',
      };
      if (artwork.rarity !== 'limited_edition') {
          artworkPayload.edition_info.numeric_size = null;
          artworkPayload.edition_info.ap_size = null;
          artworkPayload.edition_info.sold_editions = [];
      }

      artworkPayload.keywords = Array.from(new Set([...(artwork.keywords || []), ...selectedTags.map(t => t.name)]));

      artworkPayload.exhibitions = artwork.exhibitions || [];
      artworkPayload.literature = artwork.literature || [];

      artworkPayload.inventory_number = artwork.inventory_number || null;
      artworkPayload.private_note = artwork.private_note || null;
      artworkPayload.location = artwork.location || null;
      artworkPayload.status = artwork.status || 'pending';

      artworkPayload.has_certificate_of_authenticity = artwork.has_certificate_of_authenticity ?? false;
      artworkPayload.certificate_of_authenticity_details = artwork.has_certificate_of_authenticity ? (artwork.certificate_of_authenticity_details || null) : null;
      artworkPayload.condition = artwork.condition || null;
      artworkPayload.condition_notes = artwork.condition_notes || null;
      artworkPayload.rarity = artwork.rarity || 'unique';
      artworkPayload.framing_status = artwork.framing_status || 'unframed';

      // Set these to null or current state, as they are managed on artwork_images directly or derived from client
      artworkPayload.genre = artwork.genre || null;
      artworkPayload.subject = artwork.subject || null;
      artworkPayload.orientation = artwork.orientation || null;
      artworkPayload.dominant_colors = artwork.dominant_colors || null;
      artworkPayload.primary_image_url = artwork.primary_image_url || null; // Ensure this is also saved if changed elsewhere

      artworkPayload.artwork_images = undefined; // Don't send relations back to DB update
      artworkPayload.artwork_catalogue_junction = undefined;
      artworkPayload.artist = undefined;


      if (!artworkPayload.slug || artworkPayload.title !== originalTitle || !artworkId || artworkId === 'new-artwork-temp-id') {
        const { data: slugData, error: slugError } = await supabase.rpc('generate_unique_slug', {
          input_text: artworkPayload.title || 'untitled',
          table_name: 'artworks',
        });
        if (slugError) throw slugError;
        artworkPayload.slug = slugData;
      }

      let savedArtwork: Artwork; // Use AppArtwork type
      let currentArtworkId = artworkId;

      if (currentArtworkId && currentArtworkId !== 'new-artwork-temp-id') {
        const { data: updatedData, error: updateError } = await supabase
          .from('artworks')
          .update(artworkPayload)
          .eq('id', currentArtworkId)
          .select()
          .single();
        if (updateError) throw updateError;
        savedArtwork = updatedData as Artwork; // Cast to Artwork
      } else {
        if (!user?.id) throw new Error("User not authenticated to create artwork.");
        const { data: insertedData, error: insertError } = await supabase
          .from('artworks')
          .insert([{ ...artworkPayload, user_id: user.id }])
          .select()
          .single();
        if (insertError) throw insertError;
        savedArtwork = insertedData as Artwork; // Cast to Artwork
        navigate(`/u/artworks/edit/${savedArtwork.id}`);
        currentArtworkId = savedArtwork.id;
      }

      await supabase.from('artwork_catalogue_junction').delete().eq('artwork_id', savedArtwork.id);
      if (finalCatalogueIds.length > 0) {
        const newJunctions = finalCatalogueIds.map((catId) => ({ artwork_id: savedArtwork.id, catalogue_id: catId }));
        const { error: insertError } = await supabase.from('artwork_catalogue_junction').insert(newJunctions);
        if (insertError) throw insertError;
      }
      
      // Explicitly trigger client-side processing on save if a primary image exists
      // This will ensure dominant colors, watermarks, and visualizations are up-to-date
      if (primaryArtworkImage && savedArtwork.id) {
        // Use the saved artwork's data, which now has the latest title/dimensions etc.
        await collectImageMetadataAndGenerateImages(primaryArtworkImage, artworkPayload, artistFullName, true);
      }

      toast.success('Artwork saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['artwork-editor-data', savedArtwork.id] });
      queryClient.invalidateQueries({ queryKey: ['artworks'] });
      if (onSaveSuccess) onSaveSuccess(savedArtwork.id);

    } catch (err: any) {
      console.error('Error saving artwork:', err);
      toast.error(`Error saving artwork: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [artwork, artworkId, user?.id, originalTitle, selectedCatalogues, selectedTags, images.length, isFormValid, onSaveSuccess, navigate, pricingModel, allCatalogues, primaryArtworkImage, artistFullName, collectImageMetadataAndGenerateImages]);


  // -------------------- UI Rendering --------------------

  if (isLoading) return <div style={{ padding: '2rem' }}>Loading artwork details...</div>;

  return (
    <form id={formId} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* PRIMARY INFORMATION */}
      <fieldset className="fieldset">
        <legend className="legend">Artwork Images</legend>

        {/* Dropzone */}
        <ImageDropzone artworkId={artworkId || ''} images={images} onUploadSuccess={handleDropzoneImageAdd} isUploading={isUploadingNewImage} />
        {(touched.images && images.length === 0) && (
          <p className="text-red-500 text-sm">At least one image is required.</p>
        )}
        {(isUploadingNewImage || isProcessingImagesClientSide) && (
            <div style={{ marginTop: '1rem' }}>
                <Typography variant="body2" color="textSecondary">
                    {isUploadingNewImage ? "Uploading new images..." : "Processing images (dominant colors, watermark, visualization)..."}
                </Typography>
                <LinearProgress />
            </div>
        )}


        {/* Sortable Images List */}
        {images.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleImageDragEnd}>
              <SortableContext items={images.map(img => img.id)} strategy={verticalListSortingStrategy}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                  {images.map((img) => (
                    <SortableImage
                      key={img.id}
                      image={img}
                      onDelete={handleDeleteImage}
                      onReplace={handleReplaceImage}
                      onSetPrimary={handleSetPrimary}
                      isReplacing={isReplacingExistingImage === img.id}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </fieldset>


      <fieldset className="fieldset">
        <legend className="legend">Primary Information</legend>

        {/* Status Field (Button Group) */}
        <label className="label">Artwork Status</label>
        <ToggleButtonGroup
          value={artwork.status || 'pending'}
          exclusive
          onChange={handleStatusChange}
          aria-label="artwork status"
          fullWidth
          className={`mt-2 ${touched.status && !artwork.status ? 'border-red-500 rounded-md' : ''}`}
        >
          <ToggleButton value="pending" aria-label="pending">Pending</ToggleButton>
          <ToggleButton value="available" aria-label="available">Available</ToggleButton>
          <ToggleButton value="on_hold" aria-label="on hold">On Hold</ToggleButton>
          <ToggleButton value="sold" aria-label="sold">Sold</ToggleButton>
        </ToggleButtonGroup>
        {touched.status && !artwork.status && <p className="text-red-500 text-sm mt-1">Status is required</p>}

        {/* Creation Date field (Button Group) */}
        <label className="label mt-4">Creation Date</label>
        <ToggleButtonGroup
          value={artwork.date_info?.type || 'year_only'}
          exclusive
          onChange={handleDateTypeChange}
          aria-label="creation date type"
          fullWidth
          className={`mt-2 ${touched.date_info.type && !artwork.date_info?.type ? 'border-red-500 rounded-md' : ''}`}
        >
          <ToggleButton value="year_only" aria-label="year only">Year Only</ToggleButton>
          <ToggleButton value="full_date" aria-label="full date">Full Date</ToggleButton>
          <ToggleButton value="date_range" aria-label="date range">Date Range</ToggleButton>
          <ToggleButton value="circa" aria-label="circa">Circa</ToggleButton>
        </ToggleButtonGroup>
        {touched.date_info.type && !artwork.date_info?.type && <p className="text-red-500 text-sm mt-1">Creation date type is required</p>}


        {(artwork.date_info?.type === 'year_only' || artwork.date_info?.type === 'full_date' || artwork.date_info?.type === 'circa') ? (
          <TextField
            name="date_info.date_value"
            label={artwork.date_info?.type === 'year_only' ? 'Year' : (artwork.date_info?.type === 'full_date' ? 'Date' : 'Year (Circa)')}
            type={artwork.date_info?.type === 'full_date' ? 'date' : 'number'}
            value={artwork.date_info?.date_value || ''}
            onChange={handleFormChange}
            onBlur={() => setTouched(prev => ({ ...prev, date_info: { ...prev.date_info, date_value: true } }))}
            error={touched.date_info.date_value && !artwork.date_info?.date_value}
            helperText={touched.date_info.date_value && !artwork.date_info?.date_value && 'Date is required'}
            fullWidth
            margin="normal"
            required
          />
        ) : artwork.date_info?.type === 'date_range' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <TextField
              name="date_info.start_date"
              label="Start Year"
              type="number"
              value={artwork.date_info?.start_date || ''}
              onChange={handleFormChange}
              onBlur={() => setTouched(prev => ({ ...prev, date_info: { ...prev.date_info, start_date: true } }))}
              error={touched.date_info.start_date && !artwork.date_info?.start_date}
              helperText={touched.date_info.start_date && !artwork.date_info?.start_date && 'Start year is required'}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              name="date_info.end_date"
              label="End Year"
              type="number"
              value={artwork.date_info?.end_date || ''}
              onChange={handleFormChange}
              onBlur={() => setTouched(prev => ({ ...prev, date_info: { ...prev.date_info, end_date: true } }))}
              error={touched.date_info.end_date && !artwork.date_info?.end_date}
              helperText={touched.date_info.end_date && !artwork.date_info?.end_date && 'End year is required'}
              fullWidth
              margin="normal"
              required
            />
          </div>
        )}

        {/* Title */}
        <label className="label">Title</label>
        <TextField
          name="title"
          label="Artwork Title"
          type="text"
          value={artwork.title || ''}
          onChange={handleFormChange}
          onBlur={() => setTouched(prev => ({ ...prev, title: true }))}
          error={touched.title && (artwork.title || '').trim().length === 0}
          helperText={touched.title && (artwork.title || '').trim().length === 0 && 'Title is required'}
          fullWidth
          margin="normal"
          required
        />

        {/* Description (Optional) */}
        <label className="label" style={{ marginTop: '1rem' }}>Description (Optional)</label>
        <TextField
          name="description"
          label="Artwork Description"
          multiline
          rows={3}
          value={artwork.description || ''}
          onChange={handleFormChange}
          onBlur={() => setTouched(prev => ({ ...prev, description: true }))}
          fullWidth
          margin="normal"
        />

         {/* Free-form Medium Text Area */}
        <label className="label">Medium (Free-form Text)</label>
        <TextField
          name="medium"
          label="Detailed Medium / Technique (e.g., 'Oil on canvas', 'Bronze sculpture')"
          multiline
          rows={3}
          value={artwork.medium || ''}
          onChange={handleManualMediumChange} // This updates artwork.medium and then triggers the useEffect for autocompletes
          onBlur={() => setTouched(prev => ({ ...prev, medium: true }))}
          error={touched.medium && (artwork.medium || '').trim().length === 0}
          helperText={touched.medium && (artwork.medium || '').trim().length === 0 && 'Medium is required'}
          fullWidth
          margin="normal"
          required
        />

      </fieldset>

      {/* PRICING */}
      <fieldset className="fieldset">
        <legend className="legend">Pricing</legend>
        <label className="label">Pricing Model</label>
        <select name="pricing_model" className="select" value={pricingModel} onChange={handlePricingModelChange}>
          <option value="fixed">Fixed Price</option>
          <option value="negotiable">Negotiable Price</option>
          <option value="on_request">Price on Request</option>
        </select>

        {(pricingModel === 'fixed' || pricingModel === 'negotiable') && (
          <TextField
            name="price"
            label={pricingModel === 'fixed' ? 'Price (USD)' : 'Display Price (USD)'}
            type="number"
            inputProps={{ step: "0.01" }} // Use inputProps for step
            value={artwork.price ?? ''}
            onChange={handleFormChange}
            onBlur={() => setTouched(prev => ({ ...prev, price: true }))}
            error={Boolean(touched.price && (artwork.price === null || artwork.price === undefined || artwork.price <= 0))}
            helperText={touched.price && (artwork.price === null || artwork.price === undefined || artwork.price <= 0) && 'Price is required and must be greater than 0'}
            fullWidth
            margin="normal"
            required={pricingModel !== 'on_request'}
          />
        )}

        {pricingModel === 'negotiable' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <TextField
              name="min_price"
              label="Min Price (Optional)"
              type="number"
              inputProps={{ step: "0.01" }} // Use inputProps for step
              value={artwork.min_price ?? ''}
              onChange={handleFormChange}
              onBlur={() => setTouched(prev => ({ ...prev, min_price: true }))}
              fullWidth
              margin="normal"
            />
            <TextField
              name="max_price"
              label="Max Price (Optional)"
              type="number"
              inputProps={{ step: "0.01" }} // Use inputProps for step
              value={artwork.max_price ?? ''}
              onChange={handleFormChange}
              onBlur={() => setTouched(prev => ({ ...prev, max_price: true }))}
              fullWidth
              margin="normal"
            />
          </div>
        )}
      </fieldset>

      {/* ARTWORK PHYSICAL DETAILS: Dimensions, Framing, Signature */}
      <fieldset className="fieldset">
        <legend className="legend">Artwork Physical Details</legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {/* Dimensions */}
          <TextField
            name="dimensions.height"
            label="Height"
            type="number"
            value={artwork.dimensions?.height ?? ''}
            onChange={handleFormChange}
            onBlur={() => setTouched(prev => ({ ...prev, dimensions: { ...prev.dimensions, height: true } }))}
            error={Boolean(touched.dimensions.height && (artwork.dimensions?.height === null || artwork.dimensions?.height === undefined))}
            helperText={touched.dimensions.height && (artwork.dimensions?.height === null || artwork.dimensions?.height === undefined) && 'Height is required'}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            name="dimensions.width"
            label="Width"
            type="number"
            value={artwork.dimensions?.width ?? ''}
            onChange={handleFormChange}
            onBlur={() => setTouched(prev => ({ ...prev, dimensions: { ...prev.dimensions, width: true } }))}
            error={Boolean(touched.dimensions.width && (artwork.dimensions?.width === null || artwork.dimensions?.width === undefined))}
            helperText={touched.dimensions.width && (artwork.dimensions?.width === null || artwork.dimensions?.width === undefined) && 'Width is required'}
            fullWidth
            margin="normal"
            required
          />
          <TextField
            name="dimensions.depth"
            label="Depth (optional)"
            type="number"
            value={artwork.dimensions?.depth ?? ''}
            onChange={handleFormChange}
            onBlur={() => setTouched(prev => ({ ...prev, dimensions: { ...prev.dimensions, depth: true } }))}
            fullWidth
            margin="normal"
          />
          {/* Unit is fixed to cm as per requirement */}
          <TextField
            name="dimensions.unit"
            label="Unit"
            value="cm"
            InputProps={{ readOnly: true }}
            disabled
            fullWidth
            margin="normal"
          />
        </div>

        {/* Framing Status (Toggle Button Group) */}
        <label className="label mt-4">Framing Status</label>
        <ToggleButtonGroup
          value={artwork.framing_status || 'unframed'}
          exclusive
          onChange={handleFramingStatusChange}
          aria-label="framing status"
          fullWidth
          className={`mt-2 ${touched.framing_status && !artwork.framing_status ? 'border-red-500 rounded-md' : ''}`}
        >
          <ToggleButton value="unframed" aria-label="unframed">Unframed</ToggleButton>
          <ToggleButton value="framed" aria-label="framed">Framed</ToggleButton>
          <ToggleButton value="frame_optional" aria-label="frame optional">Frame Optional</ToggleButton>
        </ToggleButtonGroup>
        {touched.framing_status && !artwork.framing_status && <p className="text-red-500 text-sm mt-1">Framing status is required</p>}


        {/* Conditional Frame Details */}
        {artwork.framing_status === 'framed' && (
          <TextField
            name="framing_info.details"
            label="Frame Details"
            multiline
            rows={2}
            value={(artwork.framing_info?.details || '')}
            onChange={handleFormChange}
            onBlur={() => setTouched(prev => ({ ...prev, framing_info: { ...prev.framing_info, details: true } }))}
            error={Boolean(touched.framing_info?.details && (artwork.framing_info?.details || '').trim().length === 0)}
            helperText={touched.framing_info?.details && (artwork.framing_info?.details || '').trim().length === 0 && 'Frame details are required if currently framed'}
            fullWidth
            margin="normal"
            required
          />
        )}


          {/* Signature (Toggle Switch) */}
          <div style={{ marginTop: '1rem' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={!!artwork.signature_info?.is_signed}
                  onChange={handleSignedSwitchChange}
                  name="signature_info.is_signed"
                />
              }
              label="Signed"
            />
            {!!(artwork.signature_info?.is_signed) && (
              <TextField
                name="signature_info.location"
                label="Signature Location & Details"
                type="text"
                value={(artwork.signature_info?.location || '')}
                onChange={handleFormChange}
                onBlur={() => setTouched(prev => ({ ...prev.signature_info, location: true } ))} // Corrected onBlur path
                error={Boolean(touched.signature_info?.location && (artwork.signature_info?.location || '').trim().length === 0)}
                helperText={touched.signature_info?.location && (artwork.signature_info?.location || '').trim().length === 0 && 'Signature location is required if signed'}
                fullWidth
                margin="normal"
                required
              />
            )}
          </div>


        {/* Artwork Location */}
        <label className="label" style={{ marginTop: '1rem' }}>Artwork Location (Optional)</label>
        <TextField
          name="location"
          label="Current Artwork Location"
          type="text"
          value={artwork.location || ''}
          onChange={handleFormChange}
          fullWidth
          margin="normal"
        />
      </fieldset>

      {/* RARITY & EDITION INFORMATION */}
      <fieldset className="fieldset">
        <legend className="legend">Rarity & Edition Information</legend>
        <label className="label">Rarity</label>
        <ToggleButtonGroup
          value={artwork.rarity || 'unique'}
          exclusive
          onChange={handleRarityChange}
          aria-label="artwork rarity"
          fullWidth
          className={`mt-2 ${touched.rarity && !artwork.rarity ? 'border-red-500 rounded-md' : ''}`}
        >
          <ToggleButton value="unique" aria-label="unique work">Unique Work</ToggleButton>
          <ToggleButton value="limited_edition" aria-label="limited edition">Limited Edition</ToggleButton>
          <ToggleButton value="open_edition" aria-label="open edition">Open Edition</ToggleButton>
        </ToggleButtonGroup>
        {touched.rarity && !artwork.rarity && <p className="text-red-500 text-sm mt-1">Rarity is required</p>}


        {artwork.rarity === 'limited_edition' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <TextField
              name="edition_info.numeric_size"
              label="Numeric Edition Size"
              type="number"
              value={(artwork.edition_info?.numeric_size ?? '')}
              onChange={handleFormChange}
              onBlur={() => setTouched(prev => ({ ...prev, edition_info: { ...prev.edition_info, numeric_size: true } }))}
              error={Boolean(touched.edition_info?.numeric_size && (artwork.edition_info?.numeric_size === null || artwork.edition_info?.numeric_size === undefined || (artwork.edition_info?.numeric_size < 1)))}
              helperText={touched.edition_info?.numeric_size && (artwork.edition_info?.numeric_size === null || artwork.edition_info?.numeric_size === undefined || (artwork.edition_info?.numeric_size < 1)) && 'Numeric edition size is required and must be at least 1'}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              name="edition_info.ap_size"
              label="Total Artist's Proofs (APs)"
              type="number"
              value={(artwork.edition_info?.ap_size ?? '')}
              onChange={handleFormChange}
              onBlur={() => setTouched(prev => ({ ...prev, edition_info: { ...prev.edition_info, ap_size: true } }))}
              error={Boolean(touched.edition_info?.ap_size && (artwork.edition_info?.ap_size === null || artwork.edition_info?.ap_size === undefined || (artwork.edition_info?.ap_size < 0)))}
              helperText={touched.edition_info?.ap_size && (artwork.edition_info?.ap_size === null || artwork.edition_info?.ap_size === undefined || (artwork.edition_info?.ap_size < 0)) && 'APs must be a non-negative number'}
              fullWidth
              margin="normal"
            />
          </div>
        )}
      </fieldset>

      {/* SALES & INVENTORY MANAGEMENT (only if limited edition and status is not 'pending') */}
      {(artwork.rarity === 'limited_edition') && (artwork.status === 'available' || artwork.status === 'on_hold' || artwork.status === 'sold') && (
        <fieldset className="fieldset">
          <legend className="legend">Sales & Inventory Management</legend>
          <p>Check the box next to an edition to mark it as sold.</p>
          <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem', background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius)' }}>
            {(allEditions || []).length > 0 ? (
              allEditions.map((identifier) => (
                <label key={identifier} style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--card)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(artwork.edition_info?.sold_editions?.includes(identifier))}
                    onChange={(e) => handleEditionSaleChange(identifier, e.target.checked)}
                    disabled={saleMutation.isPending}
                  />
                  {identifier}
                </label>
              ))
            ) : (
              <p>No editions defined for this artwork (adjust numeric/AP size above).</p>
            )}
          </div>
        </fieldset>
      )}

      {/* CONDITION */}
      <fieldset className="fieldset">
        <legend className="legend">Condition</legend>
        <label className="label">Condition (Optional)</label>
        <select
          name="condition"
          className="select"
          value={artwork.condition || ''}
          onChange={handleFormChange}
          style={{ width: '100%', marginTop: '0.5rem' }}
        >
          <option value="">Select Condition</option>
          <option value="Excellent">Excellent</option>
          <option value="Good">Good</option>
          <option value="Fair">Fair</option>
          <option value="Poor">Poor</option>
          <option value="Restored">Restored</option>
          <option value="As Is">As Is</option>
        </select>

        <label className="label" style={{ marginTop: '1rem' }}>Condition Notes (Optional)</label>
        <TextField
          name="condition_notes"
          label="Notes on Artwork Condition"
          multiline
          rows={3}
          value={artwork.condition_notes || ''}
          onChange={handleFormChange}
          fullWidth
          margin="normal"
        />
      </fieldset>

      {/* CERTIFICATE OF AUTHENTICITY */}
      <fieldset className="fieldset">
        <legend className="legend">Certificate of Authenticity</legend>
        <FormControlLabel
          control={
            <Switch
              checked={!!artwork.has_certificate_of_authenticity}
              onChange={(e) => setArtwork(prev => ({ ...prev, has_certificate_of_authenticity: e.target.checked }))}
              name="has_certificate_of_authenticity"
            />
          }
          label="Includes Certificate of Authenticity (CoA)"
        />
        {!!artwork.has_certificate_of_authenticity && (
          <TextField
            name="certificate_of_authenticity_details"
            label="CoA Details (e.g., Issuer, Date)"
            multiline
            rows={2}
            value={artwork.certificate_of_authenticity_details || ''}
            onChange={handleFormChange}
            onBlur={() => setTouched(prev => ({ ...prev, certificate_of_authenticity_details: true }))}
            error={Boolean(touched.certificate_of_authenticity_details && (artwork.certificate_of_authenticity_details || '').trim().length === 0)}
            helperText={touched.certificate_of_authenticity_details && (artwork.certificate_of_authenticity_details || '').trim().length === 0 && 'CoA details are required if included'}
            fullWidth
            margin="normal"
            required
          />
        )}
      </fieldset>

      {/* INVENTORY & NOTES */}
      <fieldset className="fieldset">
        <legend className="legend">Inventory & Notes</legend>
        {/* Inventory Number */}
        <label className="label">Inventory Number (Optional)</label>
        <TextField
          name="inventory_number"
          label="Internal Inventory Number"
          type="text"
          value={artwork.inventory_number || ''}
          onChange={handleFormChange}
          fullWidth
          margin="normal"
        />

        {/* Private Note */}
        <label className="label" style={{ marginTop: '1rem' }}>Private Note (Optional)</label>
        <TextField
          name="private_note"
          label="Private Notes (Visible only to you)"
          multiline
          rows={3}
          value={artwork.private_note || ''}
          onChange={handleFormChange}
          fullWidth
          margin="normal"
        />
      </fieldset>

      {/* PROVENANCE */}
      <fieldset className="fieldset">
        <legend className="legend">Provenance</legend>
        <TextField
          name="provenance"
          label="Provenance History"
          multiline
          rows={3}
          value={artwork.provenance || ''}
          onChange={handleFormChange}
          fullWidth
          margin="normal"
        />
        {/* Provenance Notes (Optional, separate from main history) */}
        <label className="label" style={{ marginTop: '1rem' }}>Provenance Notes (Optional)</label>
        <TextField
          name="provenance_notes"
          label="Additional Provenance Notes"
          multiline
          rows={2}
          value={artwork.provenance_notes || ''}
          onChange={handleFormChange}
          fullWidth
          margin="normal"
        />
      </fieldset>

      {/* EXHIBITIONS */}
      <fieldset className="fieldset">
        <legend className="legend">Exhibitions</legend>
        <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          List exhibitions by year and description. Drag to reorder.
        </p>
        <button type="button" onClick={() => handleAddHistoricalEntry('exhibitions')} className="button button-secondary">
          Add Exhibition
        </button>
        {(artwork.exhibitions || []).length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEndHistoricalEntry('exhibitions', e)}>
              <SortableContext items={(artwork.exhibitions || []).map(e => e.id)} strategy={verticalListSortingStrategy}>
                {(artwork.exhibitions || []).map((entry, index) => (
                  <SortableItem key={entry.id} id={entry.id}>
                    <HistoricalEntryCard
                      entry={entry}
                      index={index}
                      onUpdate={(idx, field, value) => handleUpdateHistoricalEntry('exhibitions', idx, field, value)}
                      onRemove={(id) => handleRemoveHistoricalEntry('exhibitions', id)}
                    />
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </fieldset>

      {/* LITERATURE */}
      <fieldset className="fieldset">
        <legend className="legend">Literature</legend>
        <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          List literature references by year and description. Drag to reorder.
        </p>
        <button type="button" onClick={() => handleAddHistoricalEntry('literature')} className="button button-secondary">
          Add Literature Entry
        </button>
        {(artwork.literature || []).length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEndHistoricalEntry('literature', e)}>
              <SortableContext items={(artwork.literature || []).map(e => e.id)} strategy={verticalListSortingStrategy}>
                {(artwork.literature || []).map((entry, index) => (
                  <SortableItem key={entry.id} id={entry.id}>
                    <HistoricalEntryCard
                      entry={entry}
                      index={index}
                      onUpdate={(idx, field, value) => handleUpdateHistoricalEntry('literature', idx, field, value)}
                      onRemove={(id) => handleRemoveHistoricalEntry('literature', id)}
                    />
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </fieldset>

      {/* CATALOGUE ASSIGNMENT */}
      <fieldset className="fieldset">
        <legend className="legend">Catalogue Assignment</legend>
        <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>
          This artwork will automatically be in "Available Work" when its status is "Available". You can also add it to your custom catalogues.
        </p>
        <Autocomplete
          multiple
          options={userSelectableCatalogues}
          disableCloseOnSelect
          getOptionLabel={(option) => option.title || ''}
          value={selectedCatalogues.filter((cat) => !cat.is_system_catalogue)}
          onChange={(_, newValue: Catalogue[]) => {
            const systemCatalogue = allCatalogues.find((cat) => cat.is_system_catalogue);
            const finalSelection = systemCatalogue && artwork.status === 'available' ? [systemCatalogue, ...newValue] : newValue;
            setSelectedCatalogues(finalSelection);
          }}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => <TextField {...params} placeholder="Select catalogues..." />}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...chipProps } = getTagProps({ index });
              return <Chip key={key} variant="outlined" label={option.title || ''} {...chipProps} />;
            })
          }
          renderOption={(props, option) => (
            <Box component="li" sx={{ '& > img': { mr: 2, flexShrink: 0 } }} {...props}>
              {option.cover_image_url && (
                <img
                  loading="lazy"
                  width="40"
                  height="40"
                  src={option.cover_image_url}
                  alt={option.title || 'Catalogue cover'}
                  style={{ borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                />
              )}
              {option.title}
            </Box>
          )}
        />
      </fieldset>

      {/* METADATA & DISCOVERY (Tags, Genre, Dominant Colors, Subject, Orientation) */}
      <fieldset className="fieldset">
        <legend className="legend">Discovery</legend>

        {/* Primary/Secondary Medium Autocompletes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
          <div>
            <label className="label">Primary Medium Category</label>
            <Autocomplete
              options={allMediaTypes}
              value={selectedPrimaryMediumCategory}
              onChange={(_, newValue) => handlePrimaryMediumCategoryChange(newValue)}
              isOptionEqualToValue={(option, value) => option === value}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Primary Category"
                  onBlur={() => setTouched(prev => ({ ...prev, metadata_medium_parent: true }))} // Not used for validation directly now
                  margin="normal"
                  fullWidth
                />
              )}
              fullWidth
            />
          </div>
          <div>
            <label className="label">Secondary Medium Type (Optional)</label>
            <Autocomplete
              freeSolo
              options={secondaryMediumOptions}
              value={selectedSecondaryMediumType}
              onInputChange={(_, newInputValue) => handleSecondaryMediumTypeChange(newInputValue)}
              disabled={!selectedPrimaryMediumCategory}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={selectedPrimaryMediumCategory ? 'Search or type secondary type' : 'Select a primary category first'}
                  margin="normal"
                  fullWidth
                />
              )}
              fullWidth
            />
          </div>
        </div>

        {/* Tags (using TagManager) */}
        <TagManager
          allTags={allTags}
          selectedTags={selectedTags}
          onSelectedTagsChange={setSelectedTags}
          onTagCreate={handleTagCreate}
        />

        {/* Genre (now manual input) */}
        <TextField
          name="genre"
          label="Genre"
          value={artwork.genre || ''}
          onChange={handleFormChange}
          fullWidth
          margin="normal"
          helperText="Manually input (or integrate a client-side AI for auto-detection if available)."
          onBlur={() => setTouched(prev => ({ ...prev, genre: true }))}
          error={touched.genre && (artwork.genre || '').trim().length === 0 && !isFormValid}
        />

        {/* Subject (now manual input) */}
        <TextField
          name="subject"
          label="Subject"
          value={artwork.subject || ''}
          onChange={handleFormChange}
          fullWidth
          margin="normal"
          helperText="Manually input (or integrate a client-side AI for auto-detection if available)."
          onBlur={() => setTouched(prev => ({ ...prev, subject: true }))}
          error={touched.subject && (artwork.subject || '').trim().length === 0 && !isFormValid}
        />

        {/* Orientation (now manual input) */}
        <TextField
          name="orientation"
          label="Orientation"
          value={artwork.orientation || ''}
          onChange={handleFormChange}
          fullWidth
          margin="normal"
          helperText="Manually input (or integrate a client-side AI for auto-detection if available)."
          onBlur={() => setTouched(prev => ({ ...prev, orientation: true }))}
          error={touched.orientation && (artwork.orientation || '').trim().length === 0 && !isFormValid}
        />

        {/* Dominant Colors (Read-only, derived from image) */}
        <label className="label" style={{ marginTop: '1rem' }}>Dominant Colors (Auto-generated from primary image)</label>
        {(artwork.dominant_colors || []).length > 0 ? (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                {(artwork.dominant_colors || []).map((color, idx) => (
                    <div
                        key={idx}
                        style={{
                            width: '24px',
                            height: '24px',
                            backgroundColor: color,
                            borderRadius: '50%',
                            border: '1px solid var(--border)',
                        }}
                        title={color}
                    ></div>
                ))}
            </div>
        ) : (
            <p className="text-muted-foreground text-sm mt-1">No dominant colors detected from the primary image yet.</p>
        )}
        <p className="text-muted-foreground text-sm mt-1">Automatically detected from the primary image using ColorThief.</p>

      </fieldset>

      {/* SUBMIT BUTTON */}
      <button
        type="submit"
        className="button button-primary"
        disabled={!isFormValid || isSaving || isProcessingImagesClientSide}
        style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
      >
        {isSaving ? 'Saving...' : (isProcessingImagesClientSide ? 'Processing Images...' : 'Save Artwork')}
      </button>
    </form>
  );
};

export default ArtworkForm;