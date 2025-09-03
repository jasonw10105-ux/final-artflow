// src/pages/dashboard/collector/CollectorCollectionPage.tsx
import React from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { Link } from 'react-router-dom';
import { Award, Eye, Globe, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import Toggle from '@/components/ui/Toggle';
import '@/styles/app.css';

interface DetailedSale {
    id: string;
    artwork: {
        title: string;
        slug: string;
        image_url: string;
        artist: {
            full_name: string;
            slug: string;
        } | null;
    } | null;
}

const CollectorCollectionPage = () => {
    const { user, profile } = useAuth();
    const queryClient = useQueryClient();

    const { data: sales, isLoading, error } = useQuery<DetailedSale[], Error>({
        queryKey: ['collectorCollection', user?.id],
        queryFn: async () => {
             if (!user) return [];
            const { data, error } = await supabase
                .from('sales')
                .select(`
                    id,
                    artwork:artwork_id (
                        title, slug,
                        images:artwork_images(image_url, position),
                        artist:user_id (full_name, slug)
                    )
                `)
                .eq('collector_id', user.id)
                .order('sale_date', { ascending: false });
            if (error) throw error;
            return (data || []).map(sale => ({
                ...sale,
                artwork: sale.artwork ? {
                    ...sale.artwork,
                    image_url: sale.artwork.images?.sort((a,b) => a.position - b.position)[0]?.image_url || 'https://placehold.co/400x400?text=No+Image',
                    artist: sale.artwork.artist
                } : null
            }));
        },
        enabled: !!user
    });

    const updateVisibilityMutation = useMutation({
        mutationFn: async (isPublic: boolean) => {
            if (!user) throw new Error("User not found");
            const { error } = await supabase
                .from('profiles')
                .update({ is_collection_public: isPublic })
                .eq('id', user.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
            toast.success("Collection visibility updated!");
        },
        onError: (err: any) => {
            toast.error(`Failed to update: ${err.message}`);
        }
    });

    if (isLoading) return <div className="page-container"><p className="loading-message">Loading your collection...</p></div>;
    if (error) return <div className="page-container"><p className="error-message">Error: {error.message}</p></div>;

    const isPublic = profile?.is_collection_public ?? false;
    const publicUrl = `${window.location.origin}/${profile?.slug}/collection`;

    return (
        <div className="page-container">
            <div className="page-header-row">
                <div>
                    <h1>My Collection</h1>
                    <p className="page-subtitle">A visual overview of your acquired artworks.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        {isPublic ? <Globe size={16} className="text-primary"/> : <Lock size={16} className="text-muted-foreground"/>}
                        <span className="text-sm font-medium">{isPublic ? 'Public' : 'Private'}</span>
                        <Toggle 
                            checked={isPublic}
                            onChange={(val) => updateVisibilityMutation.mutate(val)}
                        />
                    </div>
                    <Link to="/u/vault" className="button button-secondary button-with-icon">
                        <Eye size={16} /> View Secure Vault
                    </Link>
                </div>
            </div>
            
            {isPublic && (
                <div className="public-url-banner">
                    <p>Your collection is public. Share it with this link:</p>
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer">{publicUrl}</a>
                </div>
            )}

            <div className="artwork-grid mt-8">
                {sales && sales.length > 0 ? (
                    sales.map(sale => (
                        sale.artwork && (
                            <Link to={`/${sale.artwork.artist?.slug}/artwork/${sale.artwork.slug}`} key={sale.id} className="artwork-card-link">
                                <div className="artwork-card">
                                    <img src={sale.artwork.image_url} alt={sale.artwork.title || 'Artwork'} className="artwork-card-image" />
                                    <div className="artwork-card-info">
                                        <h3 className="artwork-card-title">{sale.artwork.title}</h3>
                                        <p className="artwork-card-artist">{sale.artwork.artist?.full_name || 'Unknown Artist'}</p>
                                    </div>
                                </div>
                            </Link>
                        )
                    ))
                ) : (
                    <div className="col-span-full">
                        <div className="empty-state-card">
                            <Award size={48} className="text-muted-foreground" />
                            <h3 className="text-lg font-semibold mt-4">Your collection is empty.</h3>
                            <p className="text-muted-foreground">Artworks you purchase will appear here.</p>
                            <Link to="/artworks" className="button button-primary mt-4">Browse Artworks</Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CollectorCollectionPage;