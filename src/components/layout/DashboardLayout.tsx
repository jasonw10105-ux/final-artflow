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
