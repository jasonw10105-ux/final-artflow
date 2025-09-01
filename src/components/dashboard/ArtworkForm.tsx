import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Database } from '@/types/database.types';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';

// D&D imports
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Custom components/helpers
import { mediaTaxonomy } from '@/lib/mediaTaxonomy';
import { getMediaTypes, getMediaSubtypes } from '@/lib/mediaHelpers';
import SortableImage from './SortableImage'; // Your SortableImage component
import ImageDropzone from './ImageDropzone'; // Your ImageDropzone component
import TagManager, { Tag } from './TagManager'; // Your TagManager component


// ---------------------------------------------------
// 1. Type Definitions (Matching Supabase Schema + Relations)
// ---------------------------------------------------

type ArtworkStatus = "pending" | "available" | "on_hold" | "sold"; // 'draft' removed

// For Exhibitions and Literature (year + text combo)
interface HistoricalEntry {
  id: string; // For keying and local reordering
  year: number | null;
  description: string;
}

type Artwork = Database['public']['Tables']['artworks']['Row'] & {
  artist?: { full_name: string | null } | null;
  artwork_images?: ArtworkImage[]; // From artwork_images table
  artwork_catalogue_junction?: { catalogue: Catalogue }[]; // From junction table
  // Add new fields
  inventory_number?: string | null;
  private_note?: string | null;
  provenance_notes?: string | null; // A separate note field for provenance
  location?: string | null; // Artwork location
  exhibitions?: HistoricalEntry[] | null; // Changed to array of HistoricalEntry
  literature?: HistoricalEntry[] | null;  // Changed to array of HistoricalEntry
  status?: ArtworkStatus; // New status field
  subject?: string | null; // New auto-generated field
};

type Catalogue = Database['public']['Tables']['catalogues']['Row'];

type ArtworkImage = Database['public']['Tables']['artwork_images']['Row'];

type PricingModel = 'fixed' | 'negotiable' | 'on_request';

// For nested JSONB fields
type Dimensions = {
  width?: number | null;
  height?: number | null;
  depth?: number | null;
  unit?: 'cm' | 'inch' | 'variable' | null; // Updated unit type
};

type FramingInfo = {
  is_framed?: boolean | null;
  details?: string | null;
};

type SignatureInfo = {
  is_signed?: boolean | null;
  location?: string | null;
  details?: string | null;
};

type EditionInfo = {
  is_edition?: boolean | null;
  numeric_size?: number | null;
  ap_size?: number | null;
  sold_editions?: string[] | null; // e.g., ["1/50", "AP 1/5"]
};

// Date Info for Creation Date field
type DateInfo = {
  type: 'full_date' | 'year_only' | 'date_range' | 'circa';
  date_value?: string | null; // For year or full date
  start_date?: string | null; // For date range
  end_date?: string | null; // For date range
};


interface ArtworkFormProps {
  artworkId?: string; // undefined for new artwork, UUID for editing
  formId?: string; // Optional form ID for HTML
  onSaveSuccess?: (artworkId: string) => void;
  onTitleChange?: (newTitle: string) => void;
}

// ---------------------------------------------------
// 2. Image Analysis Placeholder Functions (Actual implementations will be async)
// ---------------------------------------------------
// These are *client-side placeholders*. The actual work will be done by Supabase Edge Functions.
// We keep them to satisfy TypeScript and represent the *intent* of data generation.
const getDominantColor = async (url: string): Promise<string | null> => {
  console.log("Placeholder: Analyzing dominant color for:", url);
  return new Promise(resolve => setTimeout(() => resolve(null), 200)); // Will be updated by backend
};

const getOrientation = async (url: string): Promise<string | null> => {
  console.log("Placeholder: Analyzing orientation for:", url);
  return new Promise(resolve => setTimeout(() => resolve(null), 150)); // Will be updated by backend
};

const getKeywordsFromImage = async (url: string): Promise<string[]> => {
  console.log("Placeholder: Analyzing keywords for:", url);
  return new Promise(resolve => setTimeout(() => resolve([]), 250)); // Will be updated by backend
};

const getGenreFromImage = async (url: string): Promise<string | null> => {
  console.log("Placeholder: Analyzing genre for:", url);
  return new Promise(resolve => setTimeout(() => resolve(null), 200)); // Will be updated by backend
};

const getSubjectFromImage = async (url: string): Promise<string | null> => {
  console.log("Placeholder: Analyzing subject for:", url);
  return new Promise(resolve => setTimeout(() => resolve(null), 300)); // Will be updated by backend
};


// ---------------------------------------------------
// 3. Helper Functions (Moved to top level of component file for consistent access)
// ---------------------------------------------------

const fetchArtworkAndCatalogues = async (artworkId: string, userId: string) => {
  const { data: artworkData, error: artworkError } = await supabase
    .from('artworks')
    .select('*, artist:profiles!user_id(full_name)')
    .eq('id', artworkId)
    .single();
  if (artworkError) throw new Error(`Artwork not found: ${artworkError.message}`);

  const { data: allUserCatalogues, error: allCatError } = await supabase
    .from('catalogues')
    .select('*')
    .eq('user_id', userId);
  if (allCatError) throw new Error(`Could not fetch catalogues: ${allCatError.message}`);

  const { data: assignedJunctions, error: junctionError } = await supabase
    .from('artwork_catalogue_junction')
    .select('catalogue_id')
    .eq('artwork_id', artworkId);
  if (junctionError) throw new Error(`Could not fetch assignments: ${junctionError.message}`);

  const assignedCatalogueIds = new Set(assignedJunctions.map((j) => j.catalogue_id));
  const assignedCatalogues = allUserCatalogues.filter((cat) => assignedCatalogueIds.has(cat.id));

  return { artworkData, allUserCatalogues, assignedCatalogues };
};

const updateSaleStatus = async ({ artworkId, identifier, isSold }: { artworkId: string, identifier: string, isSold: boolean }) => {
  const { error } = await supabase.rpc('update_artwork_edition_sale', {
    p_artwork_id: artworkId,
    p_edition_identifier: identifier,
    p_is_sold: isSold,
  });
  if (error) throw error;
};

const triggerImageGeneration = async (artworkId: string, flags: { forceWatermark?: boolean; forceVisualization?: boolean } = {}) => {
  try {
    console.log(`[${artworkId}] Triggering backend image generation for metadata & visualizations.`);
    const { error } = await supabase.functions.invoke('generate-images', { // This calls your edge function
      body: {
        artworkId,
        forceWatermarkUpdate: !!flags.forceWatermark,
        forceVisualizationUpdate: !!flags.forceVisualization
      },
    });
    if (error) throw error;
    toast.success("Image processing triggered in background. Metadata will update shortly.");
  } catch (err) {
    console.error('Background image generation failed:', (err as Error).message);
    toast.error('Failed to trigger image processing: ' + (err as Error).message);
  }
};

const haveDimensionsChanged = (oldDim: Dimensions | null | undefined, newDim: Dimensions | null | undefined): boolean => {
  if (!oldDim || !newDim) return false;
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
// 4. Custom Hook: useEditionManagement (Internal to this file)
// ---------------------------------------------------
const useEditionManagement = (artwork: Partial<Artwork>, artworkId: string) => {
  const queryClient = useQueryClient();

  // Mutation to update specific edition sale status via RPC
  const saleMutation = useMutation({
    mutationFn: updateSaleStatus, // Calls the external updateSaleStatus helper
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artwork-editor-data', artworkId] });
      queryClient.invalidateQueries({ queryKey: ['artworks'] });
    },
    onError: (error: any) => {
      toast.error(`Error updating edition sale: ${error.message}`);
    },
  });

  // Memoized list of all possible edition identifiers (e.g., "1/50", "AP 1/5")
  const allEditions = useMemo(() => {
    const editionInfo = artwork.edition_info;
    if (!editionInfo?.is_edition) return [];
    const editions: string[] = [];
    const numericSize = editionInfo.numeric_size || 0;
    const apSize = editionInfo.ap_size || 0;

    for (let i = 1; i <= numericSize; i++) editions.push(`${i}/${numericSize}`);
    for (let i = 1; i <= apSize; i++) editions.push(`AP ${i}/${apSize}`);
    return editions;
  }, [artwork.edition_info?.is_edition, artwork.edition_info?.numeric_size, artwork.edition_info?.ap_size]);

  // Handler for toggling an edition's sold status
  const handleEditionSaleChange = (identifier: string, isChecked: boolean) => {
    saleMutation.mutate({ artworkId, identifier, isSold: isChecked });
  };

  return { saleMutation, handleEditionSaleChange, allEditions };
};

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
    zIndex: isDragging ? 10 : 0, // Keep dragging item on top
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
  onRemove: (id: string) => void; // Changed to accept id
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
  const { user, profile } = useAuth(); // Use useAuth hook
  const navigate = useNavigate(); // Added for navigation after new artwork creation
  const queryClient = useQueryClient();

  // -------------------- State Management (All hooks at top-level) --------------------
  const [artwork, setArtwork] = useState<Partial<Artwork>>({});
  const [originalTitle, setOriginalTitle] = useState(''); // To check for slug regeneration
  const [allCatalogues, setAllCatalogues] = useState<Catalogue[]>([]);
  const [selectedCatalogues, setSelectedCatalogues] = useState<Catalogue[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]); // For TagManager (fetch this from DB if global tags exist)
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]); // For TagManager (artwork's assigned tags)
  const [images, setImages] = useState<ArtworkImage[]>([]); // For ImageDropzone and SortableImage
  const [isSaving, setIsSaving] = useState(false);

  // For inline validation UX (using name strings for simplicity, more robust with form libraries)
  const [touched, setTouched] = useState<{
    title: boolean; description: boolean; price: boolean; images: boolean; medium: boolean; date_info: boolean;
    dimensions: { width: boolean; height: boolean; depth: boolean; unit: boolean }; // Added unit to touched
    framing_info: { is_framed: boolean; details: boolean };
    signature_info: { is_signed: boolean; location: boolean };
    edition_info: { is_edition: boolean; numeric_size: boolean; ap_size: boolean };
    status: boolean; // Added status to touched
    [key: string]: any; // Allow dynamic touched properties
  }>({
    title: false, description: false, price: false, images: false, medium: false, date_info: false,
    dimensions: { width: false, height: false, depth: false, unit: false },
    framing_info: { is_framed: false, details: false },
    signature_info: { is_signed: false, location: false },
    edition_info: { is_edition: false, numeric_size: false, ap_size: false },
    status: false, // Initialized
  });

  // Declare DND sensors at the top level (Fix for "Rendered more hooks" with DndContext)
  const dndSensors = useSensors(useSensor(PointerSensor)); // Moved here to be unconditional


  // -------------------- Data Fetching (useQuery) --------------------
  const { data, isLoading } = useQuery({
    queryKey: ['artwork-editor-data', artworkId],
    queryFn: async () => {
      // Only fetch if editing (artworkId exists and is not a temporary ID) and user is logged in
      if (!artworkId || artworkId === 'new-artwork-temp-id' || !user?.id) {
        return null;
      }
      return fetchArtworkAndCatalogues(artworkId, user.id);
    },
    enabled: !!artworkId && artworkId !== 'new-artwork-temp-id' && !!user?.id,
    initialData: null, // Always provide initialData to ensure consistent hook calls
  });

  // -------------------- Custom Hooks / Derived Data (Order matters for dependencies) --------------------

  // Edition management hook
  const { saleMutation, handleEditionSaleChange, allEditions } = useEditionManagement(artwork, artworkId || '');

  // Media types and subtypes for dropdowns
  const allMediaTypes = useMemo(() => getMediaTypes(), []);
  const currentMediumParent = useMemo(() => artwork.medium?.split(': ')[0] || '', [artwork.medium]);
  const currentMediumChild = useMemo(() => artwork.medium?.split(': ')[1] || '', [artwork.medium]);
  const secondaryMediumOptions = useMemo(() => getMediaSubtypes(currentMediumParent), [currentMediumParent]);

  // Pricing model derived from artwork state
  const pricingModel: PricingModel = useMemo(() => {
    if (artwork.is_price_negotiable) return 'negotiable';
    if (artwork.price != null) return 'fixed';
    return 'on_request';
  }, [artwork.is_price_negotiable, artwork.price]);

  // Catalogue selection options (excluding system catalogues for direct user selection)
  const userSelectableCatalogues = useMemo(() => allCatalogues.filter((cat) => !cat.is_system_catalogue), [allCatalogues]);

  // Compute form validity for disabling save button and showing inline errors
  // This useMemo depends on artwork, images, and pricingModel, so it must come after their definitions
  const isFormValid = useMemo(() => {
    const isTitleValid = (artwork.title || '').trim().length > 0;
    const isPrimaryMediumValid = (artwork.medium || '').trim().length > 0; // Check the free-form medium field
    const isPriceValid = (artwork.price !== null && artwork.price! > 0) || (!!artwork.is_price_negotiable) || pricingModel === 'on_request';
    const isPrimaryImagePresent = images.length > 0; // Primary image is always images[0]
    const isCreationDateValid = !!artwork.date_info?.type && (artwork.date_info.type === 'year_only' || artwork.date_info.type === 'full_date' || artwork.date_info.type === 'circa' ? !!artwork.date_info.date_value : (artwork.date_info.type === 'date_range' ? (!!artwork.date_info.start_date && !!artwork.date_info.end_date) : true));

    const areDimensionsValid = !(artwork.dimensions?.width === null || artwork.dimensions?.width === undefined || artwork.dimensions?.height === null || artwork.dimensions?.height === undefined);

    const isFramingValid = !(!!(artwork.framing_info?.is_framed) && (artwork.framing_info?.details || '').trim().length === 0);
    const isSignatureValid = !(!!(artwork.signature_info?.is_signed) && (artwork.signature_info?.location || '').trim().length === 0);

    const isEditionSizeValid = !(!!(artwork.edition_info?.is_edition) && (artwork.edition_info?.numeric_size === null || artwork.edition_info?.numeric_size === undefined || (artwork.edition_info?.numeric_size < 1)));
    const isAPsValid = !(!!(artwork.edition_info?.is_edition) && (artwork.edition_info?.ap_size === null || artwork.edition_info?.ap_size === undefined || (artwork.edition_info?.ap_size < 0)));

    const isStatusValid = !!artwork.status; // Status should always be set

    return isTitleValid && isPrimaryMediumValid && isPriceValid && isPrimaryImagePresent && areDimensionsValid && isFramingValid && isSignatureValid && isEditionSizeValid && isAPsValid && isCreationDateValid && isStatusValid;
  }, [artwork, images.length, pricingModel, currentMediumParent]);


  // -------------------- Effects (Populate form on data fetch/artworkId change) --------------------
  useEffect(() => {
    if (data?.artworkData) {
      const { artworkData, allUserCatalogues, assignedCatalogues } = data;
      setArtwork(artworkData);
      setOriginalTitle(artworkData.title || '');
      setAllCatalogues(allUserCatalogues);

      // Only add system catalogue if artwork status is 'available'
      const systemCatalogue = allUserCatalogues.find((cat) => cat.is_system_catalogue);
      if (assignedCatalogues.length === 0 && systemCatalogue && artworkData.status === 'available') {
        setSelectedCatalogues([systemCatalogue]);
      } else {
        setSelectedCatalogues(assignedCatalogues);
      }

      setSelectedTags((artworkData.keywords || []).map(k => ({ id: k, name: k })));

      // Fetch images separately after artwork ID is confirmed
      supabase.from('artwork_images')
        .select('*')
        .eq('artwork_id', artworkId!)
        .order('position', { ascending: true })
        .then(({ data: imgData, error: imgError }) => {
          if (imgError) console.error("Error fetching artwork images:", imgError);
          else setImages(imgData || []);
        });

    } else if (artworkId === 'new-artwork-temp-id') {
      // For new artwork, set some initial defaults
      setArtwork({
        dimensions: { unit: 'cm' }, // Default unit
        framing_info: { is_framed: false, details: null },
        signature_info: { is_signed: false, location: null, details: null },
        edition_info: { is_edition: false, numeric_size: null, ap_size: null, sold_editions: [] },
        currency: 'ZAR',
        provenance: 'From the artist',
        status: 'pending', // Default status for new artwork
        date_info: { type: 'year_only', date_value: new Date().getFullYear().toString() }, // Default creation date
        title: '', description: '', price: null, genre: null, dominant_colors: null, keywords: null,
        inventory_number: null,
        private_note: null,
        provenance_notes: null,
        location: null,
        exhibitions: [], // Initialized as empty array
        literature: [],  // Initialized as empty array
        subject: null, // New field
      });
      setOriginalTitle(''); // No original title for new artwork
      setAllCatalogues(data?.allUserCatalogues || []); // Still need catalogue options for new artwork
      // For a new artwork, it starts as 'pending', so don't auto-assign 'Available Work' catalogue
      setSelectedCatalogues([]);
      setImages([]); // No images for new artwork initially
      setSelectedTags([]); // No tags for new artwork initially
    }
  }, [data, artworkId, user?.id, navigate]);


  // -------------------- Handlers --------------------

  // Generic handler for form fields (supports nested fields via dot notation in 'name')
  const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setArtwork((prev: any) => {
      // Deep update for nested JSONB fields like dimensions.width
      if (name.includes('.')) {
        let updatedValue: any = value;
        // Parse numbers for numeric fields in dimensions/edition_info
        if ((name.startsWith('dimensions.') || name.startsWith('edition_info.')) && type === 'number') {
            updatedValue = parseFloat(value) || null; // Convert to number or null if invalid
        } else if (name === 'edition_info.is_edition' && type === 'checkbox') {
            updatedValue = checked;
            // When switching to unique, clear edition sizes and sold editions
            if (!checked) {
                prev = updateNestedState(prev, 'edition_info.numeric_size', null);
                prev = updateNestedState(prev, 'edition_info.ap_size', null);
                prev = updateNestedState(prev, 'edition_info.sold_editions', []);
            } else { // When switching to edition, default sizes if they are null
                prev = updateNestedState(prev, 'edition_info.numeric_size', prev.edition_info?.numeric_size ?? 1);
                prev = updateNestedState(prev, 'edition_info.ap_size', prev.edition_info?.ap_size ?? 0);
            }
        }
        return updateNestedState(prev, name, checked !== undefined ? updatedValue : updatedValue);
      } else {
        // Direct update for top-level fields
        return { ...prev, [name]: checked !== undefined ? checked : value };
      }
    });

    if (name === 'title' && onTitleChange) onTitleChange(value);
    // Mark field as touched for validation UX
    setTouched((prev) => {
      if (name.includes('.')) {
        const keys = name.split('.');
        if (keys.length > 1) {
          // Special handling for nested boolean checkboxes to ensure object is created
          if (type === 'checkbox' && (keys[1] === 'is_framed' || keys[1] === 'is_signed' || keys[1] === 'is_edition')) {
            return { ...prev, [keys[0]]: { ...(prev[keys[0]] || {}), [keys[1]]: true, details: (checked ? (artwork.framing_info?.details || '') : null), location: (checked ? (artwork.signature_info?.location || '') : null), numeric_size: (checked ? (artwork.edition_info?.numeric_size || 1) : null), ap_size: (checked ? (artwork.edition_info?.ap_size || 0) : null), sold_editions: (checked ? (artwork.edition_info?.sold_editions || []) : []) } };
          }
          return { ...prev, [keys[0]]: { ...(prev[keys[0]] || {}), [keys[1]]: true } };
        }
      }
      return { ...prev, [name]: true };
    });
  }, [onTitleChange, artwork.framing_info?.is_framed, artwork.signature_info?.is_signed, artwork.edition_info?.is_edition, artwork.framing_info?.details, artwork.signature_info?.location, artwork.edition_info?.numeric_size, artwork.edition_info?.ap_size, artwork.edition_info?.sold_editions]);


  // Handlers for dynamic HistoricalEntry lists (Exhibitions, Literature)
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
    idToRemove: string // Use id for removal to be robust with reordering
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


  // Handler for setting primary medium (updates artwork state and resets child medium dropdown)
  const handleMediumChange = useCallback((type: 'parent' | 'child', newValue: string | null) => {
    setArtwork((prev) => {
      let newMediumStr = '';
      let parent = type === 'parent' ? (newValue || '') : (currentMediumParent || '');
      let child = type === 'child' ? (newValue || '') : (currentMediumChild || '');

      // Reset child if parent changes
      if (type === 'parent' && newValue !== currentMediumParent) {
        child = '';
      }

      newMediumStr = parent ? (child ? `${parent}: ${child}` : parent) : '';
      return { ...prev, medium: newMediumStr };
    });
    setTouched((prev) => ({ ...prev, medium: true })); // Mark medium as touched
  }, [currentMediumParent, currentMediumChild]);

  // Handler for image reordering (updates positions in DB)
  const handleImageDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setImages(prevImages => {
      const oldIndex = prevImages.findIndex(img => img.id === active.id);
      const newIndex = prevImages.findIndex(img => img.id === over.id);
      const reorderedImages = arrayMove(prevImages, oldIndex, newIndex);

      const finalOrder = reorderedImages.map((img, idx) => ({ ...img, position: idx, is_primary: idx === 0 }));

      // Update positions in DB
      finalOrder.forEach(async (img) => {
        await supabase.from('artwork_images').update({ position: img.position, is_primary: img.position === 0 }).eq('id', img.id);
      });

      // Trigger image generation if the primary image changed or was reordered to be primary
      if (finalOrder[0]?.id !== prevImages[0]?.id && artworkId && artworkId !== 'new-artwork-temp-id') {
         triggerImageGeneration(artworkId, { forceWatermark: true, forceVisualization: true });
      }

      return finalOrder;
    });
    setTouched((prev) => ({ ...prev, images: true }));
  }, [artworkId]);

  // Handler for deleting an image
  const handleDeleteImage = useCallback(async (id: string) => {
    if (!artworkId || artworkId === 'new-artwork-temp-id') {
      toast.error("Artwork not saved yet.");
      return;
    }
    if (images.length === 0) return;

    // Prevent deleting primary image if it's not the only one
    if (images[0]?.id === id && images.length > 1) {
      toast.error("Cannot delete the primary image directly. Set another image as primary first if you wish to remove this one.");
      return;
    }

    // Confirm deletion if it's the last image
    if (images.length === 1 && images[0]?.id === id) {
      if (!confirm("This is the last image. Deleting it will make the artwork invalid. Continue?")) return;
    }

    try {
      const { error } = await supabase.from('artwork_images').delete().eq('id', id);
      if (error) throw error;
      setImages(prevImages => {
        const updatedImages = prevImages.filter(img => img.id !== id);
        // Re-index and set new primary if the old primary was deleted and there are remaining images
        const finalOrder = updatedImages.map((img, idx) => ({ ...img, position: idx, is_primary: idx === 0 }));

        // If the primary image was deleted and there's a new primary, trigger generation
        if (finalOrder.length > 0 && artworkId) {
            triggerImageGeneration(artworkId, { forceWatermark: true, forceVisualization: true });
        } else if (finalOrder.length === 0 && artworkId) {
            // If no images left, consider clearing auto-generated metadata on artwork table
            supabase.from('artworks').update({ genre: null, subject: null, dominant_colors: [], keywords: [] }).eq('id', artworkId);
        }
        return finalOrder;
      });
      toast.success("Image deleted!");
    } catch (err: any) {
      console.error("Error deleting image:", err.message);
      toast.error(err.message || "Failed to delete image");
    }
    setTouched((prev) => ({ ...prev, images: true })); // Mark images as touched
  }, [images.length, images, artworkId]);


  // Handler for replacing an image
  const handleReplaceImage = useCallback(async (id: string, file: File) => {
    try {
      if (!artworkId || artworkId === 'new-artwork-temp-id') throw new Error("Artwork not saved yet.");

      const path = `${artworkId}/${uuidv4()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from('artworks').upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: publicUrlData } = supabase.storage.from('artworks').getPublicUrl(path);

      const { error: updateErr } = await supabase.from('artwork_images').update({ image_url: publicUrlData.publicUrl }).eq('id', id);
      if (updateErr) throw updateErr;

      setImages(prevImages => {
        const updatedImages = prevImages.map(img => img.id === id ? { ...img, image_url: publicUrlData.publicUrl } : img);
        // If the replaced image was primary, trigger image generation
        if (updatedImages[0]?.id === id && artworkId) {
            triggerImageGeneration(artworkId, { forceWatermark: true, forceVisualization: true });
        }
        return updatedImages;
      });
      toast.success("Image replaced!");
    } catch (err: any) {
      console.error("Error replacing image:", err.message);
      toast.error(err.message || "Failed to replace image");
    }
    setTouched((prev) => ({ ...prev, images: true }));
  }, [artworkId]);


  // Handler for setting an image as primary
  const handleSetPrimary = useCallback(async (id: string) => {
    if (!artworkId || artworkId === 'new-artwork-temp-id') {
      toast.error("Artwork not saved yet.");
      return;
    }

    setImages(prevImages => {
      const currentPrimary = prevImages.find(img => img.position === 0);
      const newPrimaryCandidate = prevImages.find(img => img.id === id);

      if (!newPrimaryCandidate || newPrimaryCandidate.position === 0) return prevImages;

      // Create new order: new primary to position 0, others shift
      const otherImages = prevImages.filter(img => img.id !== id);
      const newOrder = [newPrimaryCandidate, ...otherImages].map((img, idx) => ({ ...img, position: idx, is_primary: idx === 0 }));

      // Update positions in DB
      newOrder.forEach(async (img) => {
        await supabase.from('artwork_images').update({ position: img.position, is_primary: img.position === 0 }).eq('id', img.id);
      });

      // Trigger image generation as primary image has changed
      triggerImageGeneration(artworkId, { forceWatermark: true, forceVisualization: true });

      return newOrder;
    });
    setTouched((prev) => ({ ...prev, images: true }));
  }, [artworkId]);

  // Handler for creating a new tag via TagManager
  const handleTagCreate = useCallback(async (tagName: string): Promise<Tag | null> => {
    try {
      if (!user?.id) throw new Error("User not authenticated for tag creation.");
      const { data: newTag, error } = await supabase.from('tags').insert({ name: tagName, user_id: user.id }).select('*').single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['allArtistTags'] }); // Invalidate global tags list
      return { id: newTag.id, name: newTag.name };
    } catch (err: any) {
      console.error("Error creating tag:", err.message);
      toast.error(`Failed to create tag: ${err.message}`);
      return null;
    }
  }, [user?.id, queryClient]);


  // Handler for pricing model changes (radio buttons or select)
  const handlePricingModelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value as PricingModel;
    setArtwork((prev) => {
      const newArtwork = { ...prev };
      if (newModel === 'fixed') {
        newArtwork.is_price_negotiable = false;
        newArtwork.price = artwork.price; // Keep current price if switching to fixed, or null
        newArtwork.min_price = null;
        newArtwork.max_price = null;
      } else if (newModel === 'negotiable') {
        newArtwork.is_price_negotiable = true;
        newArtwork.price = artwork.price; // Keep current price as display price, or null
        // Min/max prices are optional with negotiable
      } else if (newModel === 'on_request') {
        newArtwork.is_price_negotiable = false;
        newArtwork.price = null;
        newArtwork.min_price = null;
        newArtwork.max_price = null;
      }
      return newArtwork;
    });
    setTouched(prev => ({ ...prev, pricing_model: true })); // Mark pricing model as touched
  }, [artwork.price, artwork.is_price_negotiable]);


  // Main form submission handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      toast.error("Please fill all required fields correctly.");
      // Manually touch all required fields to display errors
      setTouched(prev => ({
        ...prev,
        title: true, description: true, price: true, images: true, medium: true, date_info: true, status: true,
        dimensions: { ...prev.dimensions, width: true, height: true, unit: true },
        framing_info: { ...prev.framing_info, details: Boolean(artwork.framing_info?.is_framed) ? true : false },
        signature_info: { ...prev.signature_info, location: Boolean(artwork.signature_info?.is_signed) ? true : false },
        edition_info: { ...prev.edition_info, numeric_size: Boolean(artwork.edition_info?.is_edition) ? true : false, ap_size: true }, // Mark AP size as touched too
      }));
      return;
    }

    setIsSaving(true);
    try {
      // 1. Prepare artwork payload
      const systemCatalogue = allCatalogues.find((cat) => cat.is_system_catalogue);
      const finalCatalogueSelection = new Set(selectedCatalogues.map((cat) => cat.id));
      // Only add system catalogue if artwork status is 'available'
      if (systemCatalogue && artwork.status === 'available') finalCatalogueSelection.add(systemCatalogue.id);
      else if (systemCatalogue) finalCatalogueSelection.delete(systemCatalogue.id); // Ensure system catalogue is removed if artwork is not 'available'

      const finalCatalogueIds = Array.from(finalCatalogueSelection);

      // Handle JSONB fields and default values, ensuring immutability for nested objects
      let artworkPayload: Partial<Artwork> = { ...artwork }; // Start with a copy of artwork state

      // Ensure dimensions object is present and unit is set to 'cm' (fixed)
      artworkPayload.dimensions = { ...(artwork.dimensions || {}), unit: 'cm' };

      // Ensure framing_info and signature_info objects are present with defaults
      artworkPayload.framing_info = artwork.framing_info || { is_framed: false, details: null };
      artworkPayload.signature_info = artwork.signature_info || { is_signed: false, location: null, details: null };

      // Ensure edition_info object is present with defaults
      artworkPayload.edition_info = artwork.edition_info || { is_edition: false, numeric_size: null, ap_size: null, sold_editions: [] };
      // Sync selected tags
      artworkPayload.keywords = selectedTags.map(t => t.name);

      // Pass exhibitions and literature as arrays of JSONB objects
      artworkPayload.exhibitions = artwork.exhibitions || [];
      artworkPayload.literature = artwork.literature || [];

      // Add new fields to payload
      artworkPayload.inventory_number = artwork.inventory_number || null;
      artworkPayload.private_note = artwork.private_note || null;
      artworkPayload.provenance_notes = artwork.provenance_notes || null;
      artworkPayload.location = artwork.location || null;
      artworkPayload.status = artwork.status || 'pending'; // Ensure status is always set
      artworkPayload.subject = artwork.subject || null; // Include subject

      // Remove transient properties before sending to DB
      artworkPayload.artwork_images = undefined;
      artworkPayload.artwork_catalogue_junction = undefined;
      artworkPayload.artist = undefined;


      // Auto-generate slug if title changed or new artwork (if slug is not manually set)
      if (!artworkPayload.slug || artworkPayload.title !== originalTitle || !artworkId || artworkId === 'new-artwork-temp-id') {
        const { data: slugData, error: slugError } = await supabase.rpc('generate_unique_slug', {
          input_text: artworkPayload.title || 'untitled',
          table_name: 'artworks',
        });
        if (slugError) throw slugError;
        artworkPayload.slug = slugData;
      }

      // 2. Insert or Update artwork
      let savedArtwork: Artwork;
      let currentArtworkId = artworkId; // Use a mutable ID for new artwork flow

      if (currentArtworkId && currentArtworkId !== 'new-artwork-temp-id') {
        const { data: updatedData, error: updateError } = await supabase
          .from('artworks')
          .update(artworkPayload)
          .eq('id', currentArtworkId)
          .select()
          .single();
        if (updateError) throw updateError;
        savedArtwork = updatedData;
      } else {
        // Create new artwork, ensure user_id is passed
        if (!user?.id) throw new Error("User not authenticated to create artwork.");
        const { data: insertedData, error: insertError } = await supabase
          .from('artworks')
          .insert([{ ...artworkPayload, user_id: user.id }])
          .select()
          .single();
        if (insertError) throw insertError;
        savedArtwork = insertedData;
        // If a new artwork, navigate to its edit page so image uploads can use its real ID
        navigate(`/u/artworks/edit/${savedArtwork.id}`); // navigate to the new artwork's editor
        currentArtworkId = savedArtwork.id; // Update local scope artworkId for subsequent image uploads
      }

      // 3. Update catalogue junctions
      await supabase.from('artwork_catalogue_junction').delete().eq('artwork_id', savedArtwork.id);
      if (finalCatalogueIds.length > 0) {
        const newJunctions = finalCatalogueIds.map((catId) => ({ artwork_id: savedArtwork.id, catalogue_id: catId }));
        const { error: insertError } = await supabase.from('artwork_catalogue_junction').insert(newJunctions);
        if (insertError) throw insertError;
      }

      // 4. Trigger backend image analysis for auto-generated metadata
      // This happens asynchronously, so the form won't immediately display the results.
      if (images.length > 0 && savedArtwork.id) {
        triggerImageGeneration(savedArtwork.id, { forceWatermark: true, forceVisualization: true });
      }

      toast.success('Artwork saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['artwork-editor-data', savedArtwork.id] });
      queryClient.invalidateQueries({ queryKey: ['artworks'] });
      // Call onSaveSuccess for both new and existing artworks for consistent external navigation
      if (onSaveSuccess) onSaveSuccess(savedArtwork.id);

    } catch (err: any) {
      console.error('Error saving artwork:', err);
      toast.error(`Error saving artwork: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [artwork, artworkId, user?.id, originalTitle, selectedCatalogues, selectedTags, images.length, isFormValid, onSaveSuccess, navigate, pricingModel, allCatalogues]);


  // -------------------- UI Rendering --------------------

  // Show loading state for initial data fetch
  if (isLoading) return <div style={{ padding: '2rem' }}>Loading artwork details...</div>;

  return (
    <form id={formId} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* PRIMARY INFORMATION */}
      <fieldset className="fieldset">
        <legend className="legend">Primary Information</legend>

        {/* Status Field */}
        <label className="label">Artwork Status</label>
        <select
          name="status"
          className={`select ${touched.status && !artwork.status ? 'border-red-500' : ''}`}
          value={artwork.status || 'pending'} // Default to 'pending'
          onChange={handleFormChange}
          onBlur={() => setTouched(prev => ({ ...prev, status: true }))}
          required
        >
          <option value="pending">Pending</option>
          <option value="available">Available</option>
          <option value="on_hold">On Hold</option>
          <option value="sold">Sold</option>
        </select>
        {touched.status && !artwork.status && <p className="text-red-500 text-sm mt-1">Status is required</p>}

        {/* Creation Date field (Full date, Year only, Date Range or Circa) */}
        <label className="label">Creation Date</label>
        <select
          name="date_info.type"
          className={`select ${touched.date_info && !artwork.date_info?.type ? 'border-red-500' : ''}`}
          value={artwork.date_info?.type || 'year_only'}
          onChange={handleFormChange}
          onBlur={() => setTouched(prev => ({ ...prev, date_info: true }))}
          required
        >
          <option value="year_only">Year Only</option>
          <option value="full_date">Full Date</option>
          <option value="date_range">Date Range</option>
          <option value="circa">Circa</option>
        </select>
        {touched.date_info && !artwork.date_info?.type && <p className="text-red-500 text-sm mt-1">Creation date type is required</p>}


        {artwork.date_info?.type === 'year_only' || artwork.date_info?.type === 'full_date' || artwork.date_info?.type === 'circa' ? (
          <TextField
            name="date_info.date_value"
            label={artwork.date_info?.type === 'year_only' ? 'Year' : (artwork.date_info?.type === 'full_date' ? 'Date' : 'Year (Circa)')}
            type={artwork.date_info?.type === 'full_date' ? 'date' : 'number'}
            value={artwork.date_info?.date_value || ''}
            onChange={handleFormChange}
            onBlur={() => setTouched(prev => ({ ...prev, date_info: { ...prev.date_info, date_value: true } }))}
            error={touched.date_info?.date_value && !artwork.date_info?.date_value}
            helperText={touched.date_info?.date_value && !artwork.date_info?.date_value && 'Date is required'}
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
              error={touched.date_info?.start_date && !artwork.date_info?.start_date}
              helperText={touched.date_info?.start_date && !artwork.date_info?.start_date && 'Start year is required'}
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
              error={touched.date_info?.end_date && !artwork.date_info?.end_date}
              helperText={touched.date_info?.end_date && !artwork.date_info?.end_date && 'End year is required'}
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
          // Removed 'required' attribute, as it's optional
        />
      </fieldset>

      {/* IMAGES SECTION */}
      <fieldset className="fieldset">
        <legend className="legend">Artwork Images</legend>

        {/* Dropzone */}
        <ImageDropzone artworkId={artworkId || ''} images={images} setImages={setImages} />
        {(touched.images && images.length === 0) && (
          <p className="text-red-500 text-sm">At least one image is required.</p>
        )}

        {/* Sortable Images List */}
        {images.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleImageDragEnd}>
              <SortableContext items={images.map(img => img.id)} strategy={verticalListSortingStrategy}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                  {images.map((img, index) => (
                    <SortableImage
                      key={img.id}
                      image={img}
                      onDelete={handleDeleteImage}
                      onReplace={handleReplaceImage}
                      onSetPrimary={handleSetPrimary}
                      isPrimary={index === 0} // First image in the array is always primary
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
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

        {/* Framing */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem' }}>
          <div>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input type="checkbox" name="framing_info.is_framed" checked={!!(artwork.framing_info?.is_framed)} onChange={handleFormChange} /> Framed
            </label>
            {!!(artwork.framing_info?.is_framed) && (
              <TextField
                name="framing_info.details"
                label="Frame Details"
                multiline
                rows={2}
                value={(artwork.framing_info?.details || '')}
                onChange={handleFormChange}
                onBlur={() => setTouched(prev => ({ ...prev, framing_info: { ...prev.framing_info, details: true } }))}
                error={Boolean(touched.framing_info?.details && (artwork.framing_info?.details || '').trim().length === 0)}
                helperText={touched.framing_info?.details && (artwork.framing_info?.details || '').trim().length === 0 && 'Frame details are required if framed'}
                fullWidth
                margin="normal"
                required
              />
            )}
          </div>
          {/* Signature */}
          <div>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input type="checkbox" name="signature_info.is_signed" checked={!!(artwork.signature_info?.is_signed)} onChange={handleFormChange} /> Signed
            </label>
            {!!(artwork.signature_info?.is_signed) && (
              <TextField
                name="signature_info.location"
                label="Signature Location & Details"
                type="text"
                value={(artwork.signature_info?.location || '')}
                onChange={handleFormChange}
                onBlur={() => setTouched(prev => ({ ...prev, signature_info: { ...prev.signature_info, location: true } }))}
                error={Boolean(touched.signature_info?.location && (artwork.signature_info?.location || '').trim().length === 0)}
                helperText={touched.signature_info?.location && (artwork.signature_info?.location || '').trim().length === 0 && 'Signature location is required if signed'}
                fullWidth
                margin="normal"
                required
              />
            )}
          </div>
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

      {/* CATALOGUE ASSIGNMENT */}
      <fieldset className="fieldset">
        <legend className="legend">Catalogue Assignment</legend>
        <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>
          This artwork will automatically be in "Available Work" when its status is "Available". You can also add it to your custom catalogues.
        </p>
        <Autocomplete
          multiple
          options={userSelectableCatalogues}
          getOptionLabel={(option) => option.title || ''} // Ensure string returned
          value={selectedCatalogues.filter((cat) => !cat.is_system_catalogue)} // Filter out system catalogue for user selection
          onChange={(_, newValue: Catalogue[]) => {
            const systemCatalogue = allCatalogues.find((cat) => cat.is_system_catalogue);
            // Re-evaluate system catalogue inclusion based on current artwork status
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
        />
      </fieldset>

      {/* EDITION INFORMATION */}
      <fieldset className="fieldset">
        <legend className="legend">Edition Information</legend>
        <label className="label">Is this a unique work or part of an edition?</label>
        <select
          name="edition_info.is_edition"
          className="select"
          value={Boolean(artwork.edition_info?.is_edition) ? 'edition' : 'unique'} // Ensure value is boolean for select
          onChange={handleFormChange}
        >
          <option value="unique">Unique Work</option>
          <option value="edition">A Set of Editions</option>
        </select>

        {!!(artwork.edition_info?.is_edition) && (
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
              error={Boolean(touched.edition_info?.ap_size && (artwork.edition_info?.ap_size === null || artwork.edition_info?.ap_size === undefined || (artwork.edition_info?.ap_size < 0)))} // APs can be 0
              helperText={touched.edition_info?.ap_size && (artwork.edition_info?.ap_size === null || artwork.edition_info?.ap_size === undefined || (artwork.edition_info?.ap_size < 0)) && 'APs must be a non-negative number'}
              fullWidth
              margin="normal"
            />
          </div>
        )}
      </fieldset>

      {/* SALES & INVENTORY MANAGEMENT (only if editioned and status is not 'pending') */}
      {!!(artwork.edition_info?.is_edition) && (artwork.status === 'available' || artwork.status === 'on_hold' || artwork.status === 'sold') && (
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


      {/* METADATA & DISCOVERY (Tags, Genre, Dominant Colors, Subject) */}
      <fieldset className="fieldset">
        <legend className="legend">Metadata & Discovery</legend>
        {/* Free-form Medium Text Area */}
        <label className="label">Medium (Free-form Text)</label>
        <TextField
          name="medium"
          label="Detailed Medium / Technique"
          multiline
          rows={3}
          value={artwork.medium || ''}
          onChange={handleFormChange}
          onBlur={() => setTouched(prev => ({ ...prev, medium: true }))}
          error={touched.medium && (artwork.medium || '').trim().length === 0}
          helperText={touched.medium && (artwork.medium || '').trim().length === 0 && 'Medium is required'}
          fullWidth
          margin="normal"
          required
        />

        {/* Primary/Secondary Medium */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <label className="label">Primary Medium Category</label>
            <Autocomplete
              options={allMediaTypes}
              value={currentMediumParent || null}
              onChange={(_, newValue) => handleMediumChange('parent', newValue)}
              isOptionEqualToValue={(option, value) => option === value}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Primary Category"
                  onBlur={() => setTouched(prev => ({ ...prev, metadata_medium_parent: true }))}
                  error={touched.metadata_medium_parent && !currentMediumParent}
                  helperText={touched.metadata_medium_parent && !currentMediumParent && 'Primary medium category is recommended for discovery'}
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
              value={currentMediumChild || null}
              onInputChange={(_, newInputValue) => handleMediumChange('child', newInputValue)}
              disabled={!currentMediumParent}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={currentMediumParent ? 'Search or type secondary type' : 'Select a primary category first'}
                  margin="normal"
                  fullWidth
                />
              )}
              fullWidth
              margin="normal" // This margin should be on the TextField, not Autocomplete itself
            />
          </div>
        </div>

        {/* Tags (using TagManager) */}
        <TagManager
          allTags={allTags} // Assuming you'd fetch this globally from DB
          selectedTags={selectedTags}
          onSelectedTagsChange={setSelectedTags}
          onTagCreate={handleTagCreate}
        />

        {/* Genre */}
        <TextField
          name="genre"
          label="Genre (Auto-generated from image if available)"
          value={artwork.genre || ''}
          onChange={handleFormChange}
          fullWidth
          margin="normal"
        />

        {/* Subject */}
        <TextField
          name="subject"
          label="Subject (Auto-generated from image if available)"
          value={artwork.subject || ''}
          onChange={handleFormChange} // Allow manual override
          fullWidth
          margin="normal"
        />

        {/* Dominant Colors */}
        <TextField
          name="dominant_colors"
          label="Dominant Colors (Auto-generated from image)"
          value={(artwork.dominant_colors || []).join(', ')}
          onChange={e => setArtwork(prev => ({ ...prev, dominant_colors: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
          fullWidth
          margin="normal"
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
            step="0.01"
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
              step="0.01"
              value={artwork.min_price ?? ''}
              onChange={handleFormChange}
              onBlur={() => setTouched(prev => ({ ...prev, min_price: true }))} // Optional validation
              fullWidth
              margin="normal"
            />
            <TextField
              name="max_price"
              label="Max Price (Optional)"
              type="number"
              step="0.01"
              value={artwork.max_price ?? ''}
              onChange={handleFormChange}
              onBlur={() => setTouched(prev => ({ ...prev, max_price: true }))} // Optional validation
              fullWidth
              margin="normal"
            />
          </div>
        )}
      </fieldset>

      {/* SUBMIT BUTTON */}
      <button
        type="submit"
        className="button button-primary"
        disabled={!isFormValid || isSaving}
        style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
      >
        {isSaving ? 'Saving...' : 'Save Artwork'}
      </button>
    </form>
  );
};

export default ArtworkForm;