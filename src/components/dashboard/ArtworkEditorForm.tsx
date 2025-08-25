import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Database } from '@/types/database.types';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';

// --- TYPE DEFINITIONS ---
type Artwork = Database['public']['Tables']['artworks']['Row'] & {
    artist: { full_name: string | null } | null;
};
type Catalogue = Database['public']['Tables']['catalogues']['Row'];

// --- PROPS INTERFACE ---
interface ArtworkEditorFormProps {
  artworkId: string;
  formId: string;
  onSaveSuccess: () => void;
  onTitleChange?: (newTitle: string) => void;
}

// --- MEDIA TAXONOMY ---
const mediaTaxonomy: Record<string, string[]> = { /* ... your full taxonomy ... */ };

// --- API FUNCTIONS ---
const fetchArtworkAndCatalogues = async (artworkId: string, userId: string) => {
    const { data: artworkData, error: artworkError } = await supabase.from('artworks').select('*, artist:profiles!user_id(full_name)').eq('id', artworkId).single();
    if (artworkError) throw new Error(`Artwork not found: ${artworkError.message}`);

    const { data: allUserCatalogues, error: allCatError } = await supabase.from('catalogues').select('id, title, is_system_catalogue').eq('user_id', userId);
    if (allCatError) throw new Error(`Could not fetch catalogues: ${allCatError.message}`);

    const { data: assignedJunctions, error: junctionError } = await supabase.from('artwork_catalogue_junction').select('catalogue_id').eq('artwork_id', artworkId);
    if (junctionError) throw new Error(`Could not fetch assignments: ${junctionError.message}`);
    
    const assignedCatalogueIds = new Set(assignedJunctions.map(j => j.catalogue_id));
    const assignedCatalogues = allUserCatalogues.filter(cat => assignedCatalogueIds.has(cat.id));

    return { artworkData: artworkData as Artwork, allUserCatalogues: allUserCatalogues as Catalogue[], assignedCatalogues: assignedCatalogues as Catalogue[] };
};

// --- HELPER HOOKS ---
const useFormHandlers = (setArtwork: React.Dispatch<React.SetStateAction<Partial<Artwork>>>, onTitleChange?: (newTitle: string) => void) => {
    const handleJsonChange = (parent: keyof Omit<Artwork, 'artist'>, field: string, value: any) => {
        const oldParentState = (artwork as Partial<Artwork>)[parent] as object || {};
        if (parent === 'edition_info' && field === 'is_edition') {
            const isEdition = Boolean(value);
            if (!isEdition) {
                setArtwork(prev => ({ ...prev, edition_info: { ...(prev.edition_info || {}), is_edition: false, numeric_size: undefined, ap_size: undefined } }));
            } else {
                setArtwork(prev => ({ ...prev, edition_info: { ...(prev.edition_info || {}), is_edition: true } }));
            }
        } else {
            setArtwork(prev => ({ ...prev, [parent]: { ...oldParentState, [field]: value } }));
        }
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
        const newArtworkState = { ...artwork, [name]: checked !== undefined ? checked : value };
        setArtwork(newArtworkState);
        if (name === 'title' && onTitleChange) onTitleChange(value);
    };
    
    return { handleFormChange, handleJsonChange };
};

const useMediumSelection = (artwork: Partial<Artwork>, setArtwork: React.Dispatch<React.SetStateAction<Partial<Artwork>>>) => {
    const { parentMedium, childMedium } = useMemo(() => {
        const mediumStr = artwork.medium || '';
        const [parent, ...childParts] = mediumStr.split(': ');
        const child = childParts.join(': ');
        if (parent && Object.keys(mediaTaxonomy).includes(parent)) {
            return { parentMedium: parent, childMedium: child || '' };
        }
        return { parentMedium: '', childMedium: mediumStr };
    }, [artwork.medium]);

    const handleMediumChange = (type: 'parent' | 'child', newValue: string | null) => {
        let newParent = parentMedium;
        let newChild = childMedium;
        if (type === 'parent') {
            newParent = newValue || '';
            newChild = '';
        } else {
            newChild = newValue || '';
        }
        let combinedMedium = newParent ? (newChild ? `${newParent}: ${newChild}` : newParent) : '';
        setArtwork(prev => ({ ...prev, medium: combinedMedium }));
    };

    const primaryMediumOptions = Object.keys(mediaTaxonomy);
    const secondaryMediumOptions = useMemo(() => {
        return parentMedium && mediaTaxonomy[parentMedium] ? mediaTaxonomy[parentMedium] : [];
    }, [parentMedium]);

    return { parentMedium, childMedium, handleMediumChange, primaryMediumOptions, secondaryMediumOptions };
};

// --- MAIN COMPONENT ---
const ArtworkEditorForm = ({ artworkId, formId, onSaveSuccess, onTitleChange }: ArtworkEditorFormProps) => {
    const { user, profile } = useAuth();
    const queryClient = useQueryClient();
    const [artwork, setArtwork] = useState<Partial<Artwork>>({});
    const [originalTitle, setOriginalTitle] = useState('');
    const [allCatalogues, setAllCatalogues] = useState<Catalogue[]>([]);
    const [selectedCatalogues, setSelectedCatalogues] = useState<Catalogue[]>([]);

    const queryKey = ['artwork-editor-data', artworkId];
    // CORRECTED: Moved onSuccess logic into a useEffect hook to comply with React Query v5
    const { data, isLoading } = useQuery({
        queryKey,
        queryFn: () => fetchArtworkAndCatalogues(artworkId, user!.id),
        enabled: !!user,
    });

    useEffect(() => {
        if (data) {
            const { artworkData, allUserCatalogues, assignedCatalogues } = data;
            setArtwork(artworkData);
            setOriginalTitle(artworkData.title || '');
            setAllCatalogues(allUserCatalogues);
            
            const systemCatalogue = allUserCatalogues.find(cat => cat.is_system_catalogue);
            if (assignedCatalogues.length === 0 && systemCatalogue && artworkData.status === 'Active') {
                setSelectedCatalogues([systemCatalogue]);
            } else {
                setSelectedCatalogues(assignedCatalogues);
            }
        }
    }, [data]);

    const updateMutation = useMutation({
        mutationFn: async ({ formData, newCatalogueIds }: { formData: Partial<Artwork>, newCatalogueIds: string[] }) => {
            const { artist, ...dataToUpdate } = formData;
            const { error: artworkUpdateError } = await supabase.from('artworks').update(dataToUpdate).eq('id', artworkId);
            if (artworkUpdateError) throw artworkUpdateError;

            await supabase.from('artwork_catalogue_junction').delete().eq('artwork_id', artworkId);
            if (newCatalogueIds.length > 0) {
                const newJunctions = newCatalogueIds.map(catId => ({ artwork_id: artworkId, catalogue_id: catId }));
                const { error: insertError } = await supabase.from('artwork_catalogue_junction').insert(newJunctions);
                if (insertError) throw insertError;
            }
            return formData; 
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['artworks'] });
            queryClient.invalidateQueries({ queryKey: ['cataloguesWithStatusCounts'] });
            queryClient.invalidateQueries({ queryKey });
            onSaveSuccess();
        },
        onError: (error: any) => alert(`Error saving artwork: ${error.message}`),
    });
    
    // CORRECTED: Called the helper hooks to get their return values
    const { parentMedium, childMedium, handleMediumChange, primaryMediumOptions, secondaryMediumOptions } = useMediumSelection(artwork, setArtwork);
    const { handleFormChange, handleJsonChange } = useFormHandlers(setArtwork, onTitleChange);
    
    // ... (rest of the logic, e.g. saleMutation, allEditions, etc., is unchanged)
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const { status, ...formData } = artwork;
        const payload: Partial<Artwork> = { ...formData, price: formData.price ? parseFloat(String(formData.price)) : null };
        if (data?.artworkData?.status === 'Pending') payload.status = 'Active';
        
        const newCatalogueIds = selectedCatalogues.map(cat => cat.id);
        updateMutation.mutate({ formData: payload, newCatalogueIds });
    };

    if (isLoading) return <div style={{padding: '2rem'}}>Loading artwork details...</div>;

    return (
        <form id={formId} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* ... The full JSX for the form from the previous correct response ... */}
            {/* No changes needed in the JSX itself */}
        </form>
    );
};

export default ArtworkEditorForm;```

---

### Part 2: Fixed Page Files

#### 2. ArtworkEditorPage.tsx
```typescript
import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Trash2, CheckCircle } from 'lucide-react';
import ArtworkEditorForm from '@/components/dashboard/ArtworkEditorForm';

const ArtworkEditorPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { artworkId } = useParams<{ artworkId: string }>();

    if (!artworkId) {
        navigate('/artist/artworks');
        return null;
    }
    
    const queryKey = ['artwork-editor-page', artworkId];
    const { data: artworkData, isLoading } = useQuery({
        queryKey,
        queryFn: async () => {
            const { data, error } = await supabase.from('artworks').select('image_url, title, status').eq('id', artworkId).single();
            if (error) throw new Error(error.message);
            return data;
        },
    });

    const soldMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.from('artworks').update({ status: 'Sold' }).eq('id', artworkId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            queryClient.invalidateQueries({ queryKey: ['artworks'] });
            queryClient.invalidateQueries({ queryKey: ['artwork-form', artworkId]});
            alert('Artwork has been marked as sold.');
        },
        onError: (error: any) => alert(`Error updating status: ${error.message}`),
    });

    // ... deleteMutation, handlers are unchanged ...

    const handleSaveSuccess = () => {
        alert('Artwork saved successfully!');
        navigate('/artist/artworks');
    };

    const FORM_ID = 'artwork-editor-form';

    return (
        <div style={{ padding: '2rem' }}>
            {/* ... (Layout JSX is unchanged) ... */}
            <main>
                {/* CORRECTED: No longer passing invalid props like 'artwork' or 'onSave' */}
                <ArtworkEditorForm
                    artworkId={artworkId}
                    formId={FORM_ID}
                    onSaveSuccess={handleSaveSuccess}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                    {/* ... (Buttons are unchanged, but now correctly reference their mutations) ... */}
                    <button type="submit" form={FORM_ID} className="button button-primary">
                        Save Changes
                    </button>
                </div>
            </main>
        </div>
    );
};
export default ArtworkEditorPage;