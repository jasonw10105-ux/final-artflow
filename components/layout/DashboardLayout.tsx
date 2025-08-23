import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { LayoutDashboard, Palette, MessageSquare, Image, Settings, LogOut, BarChart3, Users, CreditCard, Menu, X } from 'lucide-react';

const DashboardLayout = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };
    
    const isArtist = profile?.role === 'artist' || profile?.role === 'both';
    
    const artistSidebarLinks = [
        { to: "/artist/dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
        { to: "/artist/artworks", icon: <Image size={18} />, label: "Artworks" },
        { to: "/artist/catalogues", icon: <Palette size={18} />, label: "Catalogues" },
        { to: "/artist/contacts", icon: <Users size={18} />, label: "Contacts" },
        { to: "/artist/messages", icon: <MessageSquare size={18} />, label: "Messages" },
        { to: "/artist/sales", icon: <CreditCard size={18} />, label: "Sales" },
        { to: "/artist/insights", icon: <BarChart3 size={18} />, label: "Insights" },
    ];
    
    const artistBottomNavLinks = [
        { to: "/artist/dashboard", icon: <LayoutDashboard size={22} />, label: "Home" },
        { to: "/artist/artworks", icon: <Image size={22} />, label: "Art" },
        { to: "/artist/catalogues", icon: <Palette size={18} />, label: "Catalogues" },
        { to: "/artist/sales", icon: <CreditCard size={22} />, label: "Sales" },
        { to: "/artist/messages", icon: <MessageSquare size={22} />, label: "Inbox" },
    ];

    const secondaryLinks = [
        { to: "/artist/settings", icon: <Settings size={18} />, label: "Settings" },
    ];

    const linkClasses = ({ isActive }: { isActive: boolean }) => `sidebar-link ${isActive ? 'active' : ''}`;
    const mobileLinkClasses = ({ isActive }: { isActive: boolean }) => `bottom-nav-link ${isActive ? 'active' : ''}`;
    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    return (
        <>
            {isArtist && (
                <header className="mobile-top-bar">
                    <Link to="/"><img src="/logo.svg" alt="Artflow" height="40px"/></Link>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="mobile-menu-button">
                        <Menu size={24} />
                    </button>
                </header>
            )}

            {isMobileMenuOpen && (
                <div className="mobile-menu-overlay" onClick={closeMobileMenu}>
                    <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                            <button onClick={closeMobileMenu} className="mobile-menu-button"><X size={24} /></button>
                        </div>
                        <nav className="sidebar-nav">
                            {artistSidebarLinks.map(link => (
                                <NavLink key={link.to} to={link.to} className={linkClasses} onClick={closeMobileMenu}>{link.icon} {link.label}</NavLink>
                            ))}
                        </nav>
                        <div>
                            {secondaryLinks.map(link => (
                                <NavLink key={link.to} to={link.to} className={linkClasses} onClick={closeMobileMenu}>{link.icon} {link.label}</NavLink>
                            ))}
                            <button onClick={handleLogout} className="sidebar-link sidebar-footer-link"><LogOut size={18} /> Logout</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="dashboard-grid">
                <aside className="dashboard-sidebar">
                    <Link to="/"><img src="/logo.svg" alt="Artflow" height="40px"/></Link>
                    <nav className="sidebar-nav">
                        {isArtist && artistSidebarLinks.map(link => (
                            <NavLink key={link.to} to={link.to} className={linkClasses}>{link.icon} {link.label}</NavLink>
                        ))}
                    </nav>
                    <div>
                         {secondaryLinks.map(link => (
                            <NavLink key={link.to} to={link.to} className={linkClasses}>{link.icon} {link.label}</NavLink>
                         ))}
                         <button onClick={handleLogout} className="sidebar-link sidebar-footer-link"><LogOut size={18} /> Logout</button>
                    </div>
                </aside>
                
                <main className="dashboard-main">
                    <Outlet />
                </main>
            </div>
            
            {isArtist && (
                <nav className="bottom-nav">
                    {artistBottomNavLinks.map(link => (
                        <NavLink key={link.to} to={link.to} className={mobileLinkClasses}>
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