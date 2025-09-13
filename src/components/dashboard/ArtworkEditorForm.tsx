import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { X, UploadCloud } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import TagManager, { Tag } from './TagManager';
import CatalogueSelectionModal from './CatalogueSelectionModal';
import ColorThief from 'colorthief';
import { apiPost } from '@/lib/api';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface ArtworkEditorFormProps {
  artworkId?: string; // Optional: editing existing artwork
  onSaveSuccess: (artworkId: string) => void;
}

interface ExhibitionEntry {
  id: string;
  year: string;
  details: string;
}

interface ArtworkFormState {
  title: string;
  artistName: string;
  dateCreated: string;
  mediumPrimary: string;
  mediumSecondary?: string;
  dimensions: { height: string; width: string; depth?: string };
  weight?: string;
  signatureLocation?: string;
  editionInfo?: { total: number; artistProofs: number; available: number };
  description?: string;
  certificateOfAuthenticity?: boolean;
  provenance?: string;
  exhibitions: ExhibitionEntry[];
  literature?: string[];
  price?: string;
  currency?: string;
  condition?: string;
  framed?: boolean;
  frameDetails?: string;
  location?: string;
  availability?: string;
  tags: Tag[];
  keywords: Tag[];
  genre: Tag[];
  dominantColors: string[];
  orientation?: 'portrait' | 'landscape' | 'square';
  primaryImageFile?: File;
  additionalImagesFiles: File[];
  catalogueId?: string | null;
}

const ArtworkEditorForm: React.FC<ArtworkEditorFormProps> = ({ artworkId, onSaveSuccess }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formState, setFormState] = useState<ArtworkFormState>({
    title: '',
    artistName: '',
    dateCreated: '',
    mediumPrimary: '',
    mediumSecondary: '',
    dimensions: { height: '', width: '', depth: '' },
    exhibitions: [],
    tags: [],
    keywords: [],
    genre: [],
    dominantColors: [],
    additionalImagesFiles: [],
    availability: 'Available',
    currency: 'ZAR',
    condition: 'Excellent',
  });

  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showCatalogueModal, setShowCatalogueModal] = useState(false);

  // ------------------- DROPZONE -------------------
  const onPrimaryDrop = useCallback((files: File[]) => {
    if (files.length === 0) return;
    setFormState((prev) => ({ ...prev, primaryImageFile: files[0] }));
  }, []);

  const onAdditionalDrop = useCallback((files: File[]) => {
    setFormState((prev) => ({
      ...prev,
      additionalImagesFiles: [...prev.additionalImagesFiles, ...files].slice(0, 4),
    }));
  }, []);

  const { getRootProps: getPrimaryRootProps, getInputProps: getPrimaryInputProps, isDragActive: isPrimaryDragActive } = useDropzone({
    onDrop: onPrimaryDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.gif', '.jpg', '.webp'] },
    maxFiles: 1,
  });

  const { getRootProps: getAdditionalRootProps, getInputProps: getAdditionalInputProps, isDragActive: isAdditionalDragActive } = useDropzone({
    onDrop: onAdditionalDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.gif', '.jpg', '.webp'] },
    maxFiles: 4,
  });

  // ------------------- INTELLIGENT METADATA -------------------
  useEffect(() => {
    if (!formState.primaryImageFile) return;

    const img = new Image();
    img.src = URL.createObjectURL(formState.primaryImageFile);
    img.onload = () => {
      // Orientation
      const orientation =
        img.width > img.height ? 'landscape' : img.width < img.height ? 'portrait' : 'square';

      setFormState((prev) => ({ ...prev, orientation }));

      // Dominant colors using ColorThief
      try {
        const colorThief = new ColorThief();
        const dominantColor = colorThief.getColor(img); // [r,g,b]
        setFormState((prev) => ({
          ...prev,
          dominantColors: [`rgb(${dominantColor[0]},${dominantColor[1]},${dominantColor[2]})`],
        }));
      } catch (err) {
        console.warn('Error extracting dominant color', err);
      }

      // TODO: genre & keyword AI detection placeholder
      // Call smart typing service with palette-aware hints
      const hex = (prevHex: string[]) => prevHex
      const toHex = (rgb: string) => {
        const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(rgb)
        if (!m) return null
        const r = Number(m[1]), g = Number(m[2]), b = Number(m[3])
        const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
        return `#${h(r)}${h(g)}${h(b)}`
      }
      const colorHexes = formState.dominantColors.map(c => toHex(c)).filter(Boolean) as string[]
      apiPost('/api/intelligence/type-artwork', {
        title: formState.title,
        description: formState.description,
        medium: [formState.mediumPrimary, formState.mediumSecondary].filter(Boolean).join(' '),
        keywords: formState.keywords.map(k => k.name),
        colors: colorHexes,
      }).then((res: any) => {
        setFormState((prev) => ({
          ...prev,
          genre: prev.genre.length ? prev.genre : (res.inferred_genres || []).slice(0,2).map((name: string) => ({ id: uuidv4(), name })),
          keywords: prev.keywords.length ? prev.keywords : (res.suggested_keywords || []).slice(0,6).map((name: string) => ({ id: uuidv4(), name })),
          tags: prev.tags.length ? prev.tags : (res.color_names || []).slice(0,3).map((name: string) => ({ id: uuidv4(), name })),
        }))
      }).catch(() => {})
    };
  }, [formState.primaryImageFile]);

  // ------------------- ADD / REMOVE EXHIBITIONS -------------------
  const addExhibition = () => {
    setFormState((prev) => ({
      ...prev,
      exhibitions: [...prev.exhibitions, { id: uuidv4(), year: '', details: '' }],
    }));
  };

  const updateExhibition = (id: string, field: 'year' | 'details', value: string) => {
    setFormState((prev) => ({
      ...prev,
      exhibitions: prev.exhibitions.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex)),
    }));
  };

  const removeExhibition = (id: string) => {
    setFormState((prev) => ({
      ...prev,
      exhibitions: prev.exhibitions.filter((ex) => ex.id !== id),
    }));
  };

  // ------------------- TAG / KEYWORD / GENRE MANAGEMENT -------------------
  const handleTagChange = (tags: Tag[]) => setFormState((prev) => ({ ...prev, tags }));
  const handleKeywordChange = (tags: Tag[]) => setFormState((prev) => ({ ...prev, keywords: tags }));
  const handleGenreChange = (tags: Tag[]) => setFormState((prev) => ({ ...prev, genre: tags }));

  const createTagInDb = async (name: string): Promise<Tag | null> => {
    if (!user) return null;
    const { data, error } = await supabase.from('tags').insert({ name, user_id: user.id }).select('*').single();
    if (error) return null;
    const tag: Tag = { id: data.id, name: data.name };
    setAllTags((prev) => [...prev, tag]);
    return tag;
  };

  // ------------------- SAVE ARTWORK -------------------
  const saveArtworkMutation = useMutation({
    mutationFn: async (payload: FormData) => {
      const { data, error } = await supabase.from('artworks').upsert(payload).select('id').single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (savedArtwork: any) => {
      const artworkId = savedArtwork.id;

      // Upload primary image
      if (formState.primaryImageFile) {
        await supabase.storage
          .from('artwork_images')
          .upload(`${artworkId}/primary/${formState.primaryImageFile.name}`, formState.primaryImageFile, { upsert: true });
      }

      // Upload additional images
      for (const file of formState.additionalImagesFiles) {
        await supabase.storage
          .from('artwork_images')
          .upload(`${artworkId}/additional/${file.name}`, file, { upsert: true });
      }

      // Trigger watermark/visualization here AFTER save
      // TODO: Add API call for watermark / visualization processing

      toast.success('Artwork saved successfully!');
      onSaveSuccess(artworkId);
    },
    onError: (err: any) => {
      toast.error(`Error saving artwork: ${err.message}`);
    },
  });

  const handleSave = () => {
    const formData = new FormData();
    Object.entries(formState).forEach(([key, value]) => {
      if (value instanceof Array || value instanceof Object) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value as any);
      }
    });

    saveArtworkMutation.mutate(formData);
  };

  // ------------------- JSX -------------------
  return (
    <div className="artwork-editor-form">
      <h2>Artwork Editor</h2>

      <label>Title</label>
      <input
        value={formState.title}
        onChange={(e) => setFormState({ ...formState, title: e.target.value })}
        placeholder="Artwork title"
      />

      <label>Artist Name</label>
      <input
        value={formState.artistName}
        onChange={(e) => setFormState({ ...formState, artistName: e.target.value })}
        placeholder="Artist name"
      />

      {/* Primary Image */}
      <label>Primary Image</label>
      <div {...getPrimaryRootProps()} className="dropzone">
        <input {...getPrimaryInputProps()} />
        <UploadCloud />
        {isPrimaryDragActive ? <p>Drop image here</p> : <p>{formState.primaryImageFile?.name || 'Drag or click to upload'}</p>}
      </div>

      {/* Additional Images */}
      <label>Additional Images (Optional, Max 4)</label>
      <div {...getAdditionalRootProps()} className="dropzone">
        <input {...getAdditionalInputProps()} />
        <UploadCloud />
        {isAdditionalDragActive ? <p>Drop images here</p> : <p>{formState.additionalImagesFiles.length} files uploaded</p>}
      </div>

      {/* Tags */}
      <TagManager
        allTags={allTags}
        selectedTags={formState.tags}
        onSelectedTagsChange={handleTagChange}
        onTagCreate={createTagInDb}
      />

      {/* Keywords */}
      <TagManager
        allTags={allTags}
        selectedTags={formState.keywords}
        onSelectedTagsChange={handleKeywordChange}
        onTagCreate={createTagInDb}
      />

      {/* Genre */}
      <TagManager
        allTags={allTags}
        selectedTags={formState.genre}
        onSelectedTagsChange={handleGenreChange}
        onTagCreate={createTagInDb}
      />

      {/* Exhibitions */}
      <h3>Exhibitions</h3>
      {formState.exhibitions.map((ex) => (
        <div key={ex.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            placeholder="Year"
            value={ex.year}
            onChange={(e) => updateExhibition(ex.id, 'year', e.target.value)}
          />
          <input
            placeholder="Details"
            value={ex.details}
            onChange={(e) => updateExhibition(ex.id, 'details', e.target.value)}
          />
          <button onClick={() => removeExhibition(ex.id)}>Remove</button>
        </div>
      ))}
      <button onClick={addExhibition}>Add Exhibition</button>

      <button onClick={() => setShowCatalogueModal(true)}>Assign Catalogue</button>

      <button onClick={handleSave} disabled={saveArtworkMutation.isLoading}>
        {saveArtworkMutation.isLoading ? 'Saving...' : 'Save Artwork'}
      </button>

      {showCatalogueModal && (
        <CatalogueSelectionModal
          isOpen={showCatalogueModal}
          onClose={() => setShowCatalogueModal(false)}
          onSelectCatalogue={(catalogueId) => setFormState((prev) => ({ ...prev, catalogueId }))}
          currentCatalogueId={formState.catalogueId || null}
        />
      )}
    </div>
  );
};

export default ArtworkEditorForm;
