// src/pages/dashboard/artist/CatalogueListPage.tsx

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { PlusCircle, ImageOff, CheckCircle, Archive } from 'lucide-react'; // NEW: Import new icons

// --- UPDATED: This function now calls the custom database function (RPC) ---
const fetchCataloguesWithStatusCounts = async (userId: string) => {
    const { data, error } = await supabase.rpc('get_catalogues_with_status_counts', {
        auth_user_id: userId
    });

    if (error) {
        console.error("Error fetching catalogues with RPC:", error);
        throw new Error(error.message);
    }
    return data;
}

const CatalogueListPage = () => {
    const { user, profile } = useAuth();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState('created_at-desc');
    const [filterStatus, setFilterStatus] = useState('all');

    // --- UPDATED: useQuery now calls the new RPC function ---
    const { data: catalogues, isLoading } = useQuery({
        queryKey: ['cataloguesWithStatusCounts', user?.id],
        queryFn: () => fetchCataloguesWithStatusCounts(user!.id),
        enabled: !!user,
    });
    
    // --- UPDATED: Memoized logic now uses the direct counts from our RPC ---
    const processedCatalogues = useMemo(() => {
        if (!catalogues) return [];

        let filtered = catalogues.filter(cat => {
            const statusMatch = filterStatus === 'all' || (filterStatus === 'published' ? cat.is_published : !cat.is_published);
            const searchMatch = !searchQuery || cat.title.toLowerCase().includes(searchQuery.toLowerCase());
            return statusMatch && searchMatch;
        });

        const [key, direction] = sortOption.split('-');
        return filtered.sort((a, b) => {
            // UPDATED: All count keys are now top-level properties
            const valA = a[key as keyof typeof a];
            const valB = b[key as keyof typeof b];

            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;
            
            let comparison = 0;
            if (typeof valA === 'number' && typeof valB === 'number') {
                comparison = valA - valB;
            } else if (typeof valA === 'string' && typeof valB === 'string') {
                comparison = valA.localeCompare(valB);
            } else {
                comparison = new Date(valA as string).getTime() - new Date(valB as string).getTime();
            }

            return direction === 'asc' ? comparison : -comparison;
        });

    }, [catalogues, searchQuery, sortOption, filterStatus]);


    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Catalogues</h1>
                <Link to="/artist/catalogues/new" className="button button-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <PlusCircle size={16} /> Create Catalogue
                </Link>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <input 
                    className="input" 
                    placeholder="Search by title..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ flexGrow: 1, minWidth: '200px' }}
                />
                {/* --- UPDATED: Added new sorting options for Sold and Available counts --- */}
                <select className="input" value={sortOption} onChange={e => setSortOption(e.target.value)}>
                    <option value="created_at-desc">Sort by: Newest</option>
                    <option value="created_at-asc">Sort by: Oldest</option>
                    <option value="title-asc">Sort by: Title (A-Z)</option>
                    <option value="title-desc">Sort by: Title (Z-A)</option>
                    <option value="total_count-desc">Sort by: Most Artworks</option>
                    <option value="sold_count-desc">Sort by: Most Sold</option>
                    <option value="available_count-desc">Sort by: Most Available</option>
                </select>
                <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">Show All</option>
                    <option value="published">Show Published</option>
                    <option value="unpublished">Show Drafts</option>
                </select>
            </div>
            
            {isLoading ? <p>Loading catalogues...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {processedCatalogues && processedCatalogues.length > 0 ? (
                        processedCatalogues.map((cat: any) => (
                            <div key={cat.id} style={{
                                background: 'var(--card)', borderRadius: 'var(--radius)',
                                display: 'flex', alignItems: 'center', gap: '1.5rem',
                                border: '1px solid var(--border)', overflow: 'hidden'
                            }}>
                                {cat.cover_image_url ? (
                                    <img src={cat.cover_image_url} alt={cat.title} style={{ width: '150px', height: '150px', objectFit: 'cover' }}/>
                                ) : (
                                    <div style={{
                                        width: '150px', height: '150px', display: 'flex', alignItems: 'center', 
                                        justifyContent: 'center', background: 'var(--input)', color: 'var(--muted-foreground)'
                                    }}>
                                        <ImageOff size={32} />
                                    </div>
                                )}
                                <div style={{ flexGrow: 1, padding: '1rem 0' }}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                                       <h3 style={{ margin: 0 }}>{cat.title}</h3>
                                        {!cat.is_published && (
                                            <span style={{
                                                fontSize: '0.75rem', background: 'var(--secondary)', padding: '0.1rem 0.5rem', 
                                                borderRadius: 'var(--radius)', fontWeight: 500
                                            }}>Draft</span>
                                        )}
                                    </div>
                                    <p style={{ color: 'var(--muted-foreground)', margin: '0.25rem 0 1rem 0', fontSize: '0.9rem' }}>
                                        Total of {cat.total_count || 0} artwork(s)
                                    </p>
                                    
                                    {/* --- NEW: Display for Sold and Available Counts --- */}
                                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-foreground)' }}>
                                            <CheckCircle size={16} />
                                            <span>{cat.available_count || 0} Available</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--muted-foreground)' }}>
                                            <Archive size={16} />
                                            <span>{cat.sold_count || 0} Sold</span>
                                        </div>
                                    </div>

                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', paddingRight: '1.5rem' }}>
                                    {cat.is_published && profile?.slug && (
                                        <Link to={`/catalogue/${profile.slug}/${cat.slug}`} className='button-secondary button' target="_blank" rel="noopener noreferrer">View</Link>
                                    )}
                                    <Link to={`/artist/catalogues/edit/${cat.id}`} className='button-secondary button'>Edit</Link>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius)' }}>
                            <p>
                                {catalogues && catalogues.length > 0
                                    ? "No catalogues match your current filters."
                                    : "You haven't created any catalogues yet."}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CatalogueListPage;