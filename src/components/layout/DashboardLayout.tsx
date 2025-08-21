// src/components/layout/DashboardLayout.tsx

import React, { useState } from 'react';
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
    Users,
    CreditCard,
    Menu, // <-- NEW: Import for hamburger icon
    X     // <-- NEW: Import for close icon
} from 'lucide-react';

// --- CSS for Responsiveness ---
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
    
    /* --- HIDE MOBILE ELEMENTS ON DESKTOP --- */
    .mobile-top-bar, .bottom-nav, .mobile-menu-overlay {
        display: none;
    }

    /* --- Mobile Styles (< 768px) --- */
    @media (max-width: 768px) {
        .dashboard-grid {
            grid-template-columns: 1fr;
            /* Add padding top to account for the fixed top bar */
            padding-top: 60px; 
        }
        .dashboard-sidebar {
            display: none;
        }
        .dashboard-main {
            /* Adjust padding for mobile and leave space for the bottom nav */
            padding: 1.5rem 1rem 80px 1rem;
        }

        /* --- NEW: Mobile Top Bar Styles --- */
        .mobile-top-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 60px;
            background-color: var(--card);
            border-bottom: 1px solid var(--border);
            padding: 0 1rem;
            z-index: 1000;
        }

        /* --- NEW: Mobile Bottom Bar Styles --- */
        .bottom-nav {
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
        
        /* --- NEW: Mobile Hamburger Menu Styles --- */
        .mobile-menu-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0,0,0,0.5);
            z-index: 2000;
            display: flex;
            flex-direction: column;
        }
        .mobile-menu-content {
            background-color: var(--background);
            padding: 1rem;
            width: 80%;
            max-width: 300px;
            height: 100%;
            display: flex;
            flex-direction: column;
        }
    }
`;

const DashboardLayout = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // State for hamburger menu

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };
    const isArtist = profile?.role === 'artist' || profile?.role === 'both';
    const isCollector = profile?.role === 'collector' || profile?.role === 'both';

    // --- LINK DEFINITIONS FOR CLARITY ---
    const artistSidebarLinks = [
        { to: "/artist/dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
        { to: "/artist/artworks", icon: <Image size={18} />, label: "Artworks" },
        { to: "/artist/catalogues", icon: <Palette size={18} />, label: "Catalogues" },
        { to: "/artist/contacts", icon: <Users size={18} />, label: "Contacts" },
        { to: "/artist/messages", icon: <MessageSquare size={18} />, label: "Messages" },
        { to: "/artist/sales", icon: <CreditCard size={18} />, label: "Sales" },
        { to: "/artist/insights", icon: <BarChart3 size={18} />, label: "Insights" },
    ];
    
    // Most important links for the mobile bottom bar
    const artistBottomNavLinks = [
        { to: "/artist/dashboard", icon: <LayoutDashboard size={22} />, label: "Home" },
        { to: "/artist/artworks", icon: <Image size={22} />, label: "Art" },
        { to: "/artist/catalogues", icon: <Palette size={18} />, label: "Catalogues" },
        { to: "/artist/sales", icon: <CreditCard size={22} />, label: "Sales" },
        { to: "/artist/messages", icon: <MessageSquare size={22} />, label: "Inbox" },
    ];

    // Secondary links for the desktop sidebar & mobile hamburger menu
    const secondaryLinks = [
        { to: "/artist/settings", icon: <Settings size={18} />, label: "Settings" },
    ];

    // --- STYLING ---
    const baseLinkStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', textDecoration: 'none', color: 'var(--muted-foreground)', transition: 'background-color 0.2s, color 0.2s' };
    const activeLinkStyle: React.CSSProperties = { ...baseLinkStyle, backgroundColor: 'var(--secondary)', color: 'var(--foreground)' };
    const getLinkStyle = ({ isActive }: { isActive: boolean }) => isActive ? activeLinkStyle : baseLinkStyle;
    const mobileLinkStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', color: 'var(--muted-foreground)', fontSize: '0.75rem', flexGrow: 1, padding: '0.25rem 0' };
    const activeMobileLinkStyle: React.CSSProperties = { ...mobileLinkStyle, color: 'var(--primary)' };
    const getMobileLinkStyle = ({ isActive }: { isActive: boolean }) => isActive ? activeMobileLinkStyle : mobileLinkStyle;

    return (
        <>
            <style>{responsiveStyles}</style>

            {/* --- NEW: Mobile Top Bar with Hamburger Menu --- */}
            {isArtist && (
                <header className="mobile-top-bar">
                    <img src="../logo.svg" alt="Artflow" height="40px"/>
                    <button onClick={() => setIsMobileMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground)'}}>
                        <Menu size={24} />
                    </button>
                </header>
            )}

            {/* --- NEW: Mobile Hamburger Menu Overlay --- */}
            {isMobileMenuOpen && (
                <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                            <button onClick={() => setIsMobileMenuOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--foreground)'}}>
                                <X size={24} />
                            </button>
                        </div>
                        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
                            {/* Render ALL primary sidebar links in the hamburger menu */}
                            {artistSidebarLinks.map(link => (
                                <NavLink key={link.to} to={link.to} style={getLinkStyle} onClick={() => setIsMobileMenuOpen(false)}>{link.icon} {link.label}</NavLink>
                            ))}
                        </nav>
                        <div>
                            {secondaryLinks.map(link => (
                                <NavLink key={link.to} to={link.to} style={getLinkStyle} onClick={() => setIsMobileMenuOpen(false)}>{link.icon} {link.label}</NavLink>
                            ))}
                            <button onClick={handleLogout} style={{ ...baseLinkStyle, width: '100%', justifyContent: 'flex-start', background: 'transparent', border: 0 }}><LogOut size={18} /> Logout</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="dashboard-grid">
                {/* --- DESKTOP SIDEBAR --- */}
                <aside className="dashboard-sidebar">
                    <img src="../logo.svg" alt="Artflow" height="60px"/>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
                        {isArtist && artistSidebarLinks.map(link => (
                            <NavLink key={link.to} to={link.to} style={getLinkStyle}>{link.icon} {link.label}</NavLink>
                        ))}
                    </nav>
                    <div>
                         {secondaryLinks.map(link => (
                            <NavLink key={link.to} to={link.to} style={getLinkStyle}>{link.icon} {link.label}</NavLink>
                         ))}
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
                    {artistBottomNavLinks.map(link => (
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