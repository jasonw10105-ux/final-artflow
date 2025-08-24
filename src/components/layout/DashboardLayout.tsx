// src/components/layout/DashboardLayout.tsx

import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthProvider';

const DashboardLayout = () => {
    const { profile } = useAuth();
    const isArtist = profile?.role === 'artist' || profile?.role === 'both';
    const isCollector = profile?.role === 'collector' || profile?.role === 'both';

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
            <aside style={{ width: '250px', background: 'var(--card)', padding: '1.5rem', borderRight: '1px solid var(--border)' }}>
                <h2 style={{marginTop: 0}}>Dashboard</h2>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Common or Role-Specific Dashboard Links */}
                    {isArtist && <NavLink to="/artist/dashboard">Artist Home</NavLink>}
                    {isCollector && <NavLink to="/collector/dashboard">Collector Home</NavLink>}

                    <hr />
                    
                    {/* Artist-Specific Links */}
                    {isArtist && (
                        <>
                            <h3>For Artists</h3>
                            <NavLink to="/artist/artworks">Artworks</NavLink>
                            <NavLink to="/artist/catalogues">Catalogues</NavLink>
                            <NavLink to="/artist/sales">Sales</NavLink>
                            <NavLink to="/artist/insights">Insights</NavLink>
                            <NavLink to="/artist/contacts">Contacts</NavLink>
                        </>
                    )}

                    {/* Collector-Specific Links */}
                    {isCollector && (
                        <>
                            <h3>For Collectors</h3>
                            <NavLink to="/collector/collection">My Collection</NavLink>
                            <NavLink to="/collector/inquiries">My Inquiries</NavLink>
                        </>
                    )}
                    
                    <hr />

                    {/* Common Links for Both */}
                    <NavLink to={isArtist ? "/artist/messages" : "/collector/inquiries"}>Messages</NavLink>
                    <NavLink to={isArtist ? "/artist/settings" : "/collector/settings"}>Settings</NavLink>

                </nav>
            </aside>
            <main style={{ flex: 1, padding: '2rem' }}>
                <Outlet />
            </main>
        </div>
    );
};

export default DashboardLayout;