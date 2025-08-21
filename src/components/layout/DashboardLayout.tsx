// src/components/layout/DashboardLayout.tsx

import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { 
    LayoutDashboard, 
    Palette, 
    MessageSquare, 
    Image, 
    Settings, 
    LogOut, 
    BarChart3,
    Users // <-- Import the Users icon for Contacts
} from 'lucide-react';

// --- CSS for Responsiveness ---
// Using a <style> tag is the easiest way to add media queries without a separate CSS file.
const responsiveStyles = `
    .dashboard-grid {
        display: grid;
        grid-template-columns: 240px 1fr;
        height: 100vh;
        background-color: var(--background);
    }
    .dashboard-sidebar {
        border-right: 1px solid var(--border);
        padding: 1rem;
        display: flex;
        flex-direction: column;
    }
    .dashboard-main {
        padding: 2rem 3rem;
        overflow-y: auto;
    }
    .bottom-nav {
        display: none; /* Hidden on desktop */
    }

    /* --- Mobile Styles (< 768px) --- */
    @media (max-width: 768px) {
        .dashboard-grid {
            /* On mobile, the grid has only one column */
            grid-template-columns: 1fr;
        }
        .dashboard-sidebar {
            /* Hide the sidebar on mobile */
            display: none;
        }
        .dashboard-main {
            /* Adjust padding for mobile and leave space for the bottom nav */
            padding: 1.5rem 1rem 80px 1rem;
        }
        .bottom-nav {
            /* Show the bottom nav on mobile */
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            justify-content: space-around;
            align-items: flex-start;
            background-color: var(--card);
            border-top: 1px solid var(--border);
            padding: 0.5rem 0;
            height: 65px;
            z-index: 1000;
        }
    }
`;

const DashboardLayout = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };
    const isArtist = profile?.role === 'artist' || profile?.role === 'both';
    const isCollector = profile?.role === 'collector' || profile?.role === 'both';

    // --- DESKTOP SIDEBAR LINKS ---
    const artistSidebarLinks = [
        { to: "/artist/dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
        { to: "/artist/artworks", icon: <Image size={18} />, label: "Artworks" },
        { to: "/artist/catalogues", icon: <Palette size={18} />, label: "Catalogues" },
        { to: "/artist/contacts", icon: <Users size={18} />, label: "Contacts" }, // <-- CONTACTS LINK ADDED
        { to: "/artist/messages", icon: <MessageSquare size={18} />, label: "Messages" },
        { to: "/artist/insights", icon: <BarChart3 size={18} />, label: "Insights" },
    ];

    const collectorSidebarLinks = [
        { to: "/collector/dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
        { to: "/collector/inquiries", icon: <MessageSquare size={18} />, label: "My Inquiries" },
    ];
    
    // --- MOBILE BOTTOM BAR LINKS ---
    // We choose the most critical links for mobile access
    const artistMobileLinks = [
        { to: "/artist/dashboard", icon: <LayoutDashboard size={22} />, label: "Home" },
        { to: "/artist/artworks", icon: <Image size={22} />, label: "Art" },
        { to: "/artist/messages", icon: <MessageSquare size={22} />, label: "Inbox" },
        { to: "/artist/contacts", icon: <Users size={22} />, label: "Contacts" },
    ];

    // --- STYLING ---
    // Base style for all NavLinks
    const baseLinkStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', textDecoration: 'none', color: 'var(--muted-foreground)', transition: 'background-color 0.2s, color 0.2s' };
    const activeLinkStyle: React.CSSProperties = { ...baseLinkStyle, backgroundColor: 'var(--secondary)', color: 'var(--foreground)' };
    const getLinkStyle = ({ isActive }: { isActive: boolean }) => isActive ? activeLinkStyle : baseLinkStyle;

    // Styles for the mobile bottom navigation
    const mobileLinkStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', color: 'var(--muted-foreground)', fontSize: '0.75rem', flexGrow: 1, padding: '0.25rem 0' };
    const activeMobileLinkStyle: React.CSSProperties = { ...mobileLinkStyle, color: 'var(--primary)' };
    const getMobileLinkStyle = ({ isActive }: { isActive: boolean }) => isActive ? activeMobileLinkStyle : mobileLinkStyle;

    return (
        <>
            <style>{responsiveStyles}</style>
            <div className="dashboard-grid">
                {/* --- DESKTOP SIDEBAR --- */}
                <aside className="dashboard-sidebar">
                    <h2 style={{ marginBottom: '2rem', padding: '0 1rem' }}>{profile?.full_name}</h2>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
                        {isArtist && artistSidebarLinks.map(link => (
                            <NavLink key={link.to} to={link.to} style={getLinkStyle}>{link.icon} {link.label}</NavLink>
                        ))}
                        {isCollector && collectorSidebarLinks.map(link => (
                             <NavLink key={link.to} to={link.to} style={getLinkStyle}>{link.icon} {link.label}</NavLink>
                        ))}
                    </nav>
                    <div>
                         <NavLink to="/artist/settings" style={getLinkStyle}><Settings size={18} /> Settings</NavLink>
                         <button onClick={handleLogout} style={{ ...baseLinkStyle, width: '100%', justifyContent: 'flex-start', background: 'transparent', border: 0 }}><LogOut size={18} /> Logout</button>
                    </div>
                </aside>
                
                {/* --- MAIN CONTENT AREA --- */}
                <main className="dashboard-main">
                    <Outlet />
                </main>
            </div>
            
            {/* --- MOBILE BOTTOM NAVIGATION BAR --- */}
            {isArtist && (
                <nav className="bottom-nav">
                    {artistMobileLinks.map(link => (
                        <NavLink key={link.to} to={link.to} style={getMobileLinkStyle}>
                            {link.icon}
                            <span>{link.label}</span>
                        </NavLink>
                    ))}
                </nav>
            )}
        </>
    );
};

export default DashboardLayout;