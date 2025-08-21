import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { LayoutDashboard, Palette, MessageSquare, Image, Settings, LogOut, BarChart3 } from 'lucide-react';

const DashboardLayout = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };
    const isArtist = profile?.role === 'artist' || profile?.role === 'both';
    const isCollector = profile?.role === 'collector' || profile?.role === 'both';

    const baseLinkStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', textDecoration: 'none', color: 'var(--muted-foreground)', transition: 'background-color 0.2s, color 0.2s' };
    const activeLinkStyle: React.CSSProperties = { ...baseLinkStyle, backgroundColor: 'var(--secondary)', color: 'var(--foreground)' };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', height: '100vh', backgroundColor: 'var(--background)' }}>
            <aside style={{ borderRight: '1px solid var(--border)', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ marginBottom: '2rem', padding: '0 1rem' }}>{profile?.full_name}</h2>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
                    {isArtist && (
                        <>
                            <NavLink to="/artist/dashboard" style={({ isActive }) => isActive ? activeLinkStyle : baseLinkStyle}><LayoutDashboard size={18} /> Dashboard</NavLink>
                            <NavLink to="/artist/artworks" style={({ isActive }) => isActive ? activeLinkStyle : baseLinkStyle}><Image size={18} /> Artworks</NavLink>
                            <NavLink to="/artist/catalogues" style={({ isActive }) => isActive ? activeLinkStyle : baseLinkStyle}><Palette size={18} /> Catalogues</NavLink>
                            <NavLink to="/artist/messages" style={({ isActive }) => isActive ? activeLinkStyle : baseLinkStyle}><MessageSquare size={18} /> Messages</NavLink>
                            <NavLink to="/artist/insights" style={({ isActive }) => isActive ? activeLinkStyle : baseLinkStyle}><BarChart3 size={18} /> Insights</NavLink>
                        </>
                    )}
                    {isCollector && (
                         <>
                            <NavLink to="/collector/dashboard" style={({ isActive }) => isActive ? activeLinkStyle : baseLinkStyle}><LayoutDashboard size={18} /> Dashboard</NavLink>
                            <NavLink to="/collector/inquiries" style={({ isActive }) => isActive ? activeLinkStyle : baseLinkStyle}><MessageSquare size={18} /> My Inquiries</NavLink>
                        </>
                    )}
                </nav>
                <div>
                     <NavLink to="/artist/settings" style={({ isActive }) => isActive ? activeLinkStyle : baseLinkStyle}><Settings size={18} /> Settings</NavLink>
                     <button onClick={handleLogout} style={{ ...baseLinkStyle, width: '100%', justifyContent: 'flex-start', background: 'transparent', border: 0 }}><LogOut size={18} /> Logout</button>
                </div>
            </aside>
            <main style={{ padding: '2rem 3rem', overflowY: 'auto' }w}>
                <Outlet />
            </main>
        </div>
    );
};
export default DashboardLayout;