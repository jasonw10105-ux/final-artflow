import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

const fetchCatalogueBySlug = async (artistSlug: string, catalogueSlug: string) => {
    const { data, error } = await supabase.from('catalogues')
        .select(`*, artworks:catalogue_artworks(position, artwork:artworks(*)), artist:profiles(full_name, slug)`)
        .eq('slug', catalogueSlug)
        .eq('profiles.slug', artistSlug)
        .single();
    if (error) throw new Error('Catalogue not found');
    data.artworks.sort((a,b) => a.position - b.position);
    return data;
};

const PublicCataloguePage = () => {
    const { artistSlug, catalogueSlug } = useParams<{ artistSlug: string, catalogueSlug: string }>();
    const { data: catalogue, isLoading, isError } = useQuery(['catalogue', catalogueSlug], () => fetchCatalogueBySlug(artistSlug!, catalogueSlug!));

    if (isLoading) return <p style={{ textAlign: 'center', padding: '5rem' }}>Loading catalogue...</p>;
    if (isError) return <p style={{ textAlign: 'center', padding: '5rem' }}>Catalogue not found.</p>;

    return (
        <div style={{ maxWidth: '900px', margin: '2rem auto' }}>
            <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1>{catalogue.title}</h1>
                <h2>by {catalogue.artist.full_name}</h2>
                <p>{catalogue.description}</p>
            </header>
            <main style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                {catalogue.artworks.map(({artwork}: any) => (
                    <div key={artwork.id}>
                        <Link to={`/artwork/${catalogue.artist.slug}/${artwork.slug}`}>
                            <img src={artwork.image_url} alt={artwork.title} style={{ width: '100%', borderRadius: 'var(--radius)' }}/>
                        </Link>
                        <h3 style={{marginTop: '1rem'}}>{artwork.title}</h3>
                        <p style={{ color: 'var(--primary)'}}>${artwork.price}</p>
                    </div>
                ))}
            </main>
        </div>
    );
};
export default PublicCataloguePage;