// src/pages/public/PublicCataloguePage.tsx

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthProvider'; // Import useAuth to check the current user
import { Eye, Lock, Users, Edit } from 'lucide-react'; // Icons for the banner

const fetchCatalogueBySlug = async (artistSlug: string, catalogueSlug: string) => {
    // ... (This function is already correct from the previous step)
    const { data: profile, error: profileError } = await supabase
        .from('profiles').select('id, full_name, slug').eq('slug', artistSlug).single();
    if (profileError || !profile) throw new Error('Artist not found.');

    const { data: catalogue, error: catalogueError } = await supabase
        .from('catalogues').select('*, artworks!artworks_catalogue_id_fkey(*)')
        .eq('slug', catalogueSlug).eq('user_id', profile.id).single();
    if (catalogueError) throw new Error('Catalogue not found for this artist.');

    const finalData = { ...catalogue, artist: profile };
    if (finalData.artworks) {
        finalData.artworks.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return finalData;
};

// --- NEW: A helper component for the owner's status banner ---
const OwnerStatusBanner = ({ catalogue }: { catalogue: any }) => {
    let statusText = 'This catalogue is currently a draft and not visible to the public.';
    let icon = <Eye size={18} />;

    if (catalogue.is_published) {
        switch (catalogue.access_type) {
            case 'public':
                statusText = 'This catalogue is public and visible to everyone.';
                icon = <Eye size={18} />;
                break;
            case 'password':
                statusText = 'This catalogue is private and protected by a password.';
                icon = <Lock size={18} />;
                break;
            case 'contacts': // Assuming you might have this access type
                statusText = 'This catalogue is private and shared with specific contacts.';
                icon = <Users size={18} />;
                break;
            default:
                statusText = 'This catalogue is public.';
        }
    }

    return (
        <div style={{
            background: 'var(--accent)',
            border: '1px solid var(--border)',
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius)',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {icon}
                <p style={{ margin: 0, fontWeight: 500 }}>{statusText}</p>
            </div>
            <Link to={`/artist/catalogues/edit/${catalogue.id}`} className="button button-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit size={14} />
                Edit Catalogue
            </Link>
        </div>
    );
};

const PublicCataloguePage = () => {
    const { artistSlug, catalogueSlug } = useParams<{ artistSlug: string, catalogueSlug: string }>();
    const { user } = useAuth(); // Get the currently logged-in user

    const { data: catalogue, isLoading, isError, error } = useQuery({
        queryKey: ['catalogue', artistSlug, catalogueSlug],
        queryFn: () => fetchCatalogueBySlug(artistSlug!, catalogueSlug!),
        enabled: !!artistSlug && !!catalogueSlug 
    });

    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading catalogue...</p>;
    if (isError || !catalogue) {
        const errorMessage = (error as Error)?.message || 'Catalogue not found.';
        return <p style={{ textAlign: 'center', padding: '5rem' }}>{errorMessage}</p>;
    }

    // --- NEW: Check if the logged-in user is the owner of this catalogue ---
    const isOwner = user?.id === catalogue.user_id;

    return (
        <div style={{ maxWidth: '900px', margin: '2rem auto' }}>
            {/* --- NEW: Conditionally render the banner only for the owner --- */}
            {isOwner && <OwnerStatusBanner catalogue={catalogue} />}

            <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1>{catalogue.title}</h1>
                {catalogue.artist && <h2>by {catalogue.artist.full_name}</h2>}
                <p>{catalogue.description}</p>
            </header>
            <main style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                {catalogue.artworks && catalogue.artworks.length > 0 ? (
                    catalogue.artworks.map((artwork: any) => (
                        <div key={artwork.id}>
                            <Link to={`/artwork/${catalogue.artist.slug}/${artwork.slug}`}>
                                <img src={artwork.image_url} alt={artwork.title} style={{ width: '100%', borderRadius: '8px' }}/>
                            </Link>
                            <h3 style={{marginTop: '1rem'}}>{artwork.title}</h3>
                            {artwork.price && <p style={{ color: '#333'}}>${artwork.price}</p>}
                        </div>
                    ))
                ) : (
                    <p style={{ textAlign: 'center', padding: '3rem' }}>There are no artworks in this catalogue yet.</p>
                )}
            </main>
        </div>
    );
};

export default PublicCataloguePage;