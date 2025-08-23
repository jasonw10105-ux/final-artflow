// src/components/layout/MarketingLayout.tsx

import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import NotificationIcon from '../notifications/NotificationIcon';

const useIsMobile = (breakpoint = 768) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, [breakpoint]);

    return isMobile;
};

const MarketingLayout = () => {
    const isMobile = useIsMobile();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { session } = useAuth();
    const isLoggedIn = !!session;

    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isMenuOpen]);
    
    const handleLinkClick = () => {
        setIsMenuOpen(false);
    };
    
    const headerStyle: React.CSSProperties = {
        padding: '1rem 2rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    };

    const desktopNavStyle: React.CSSProperties = { display: 'flex', gap: '2rem', alignItems: 'center' };
    const linkStyle: React.CSSProperties = { color: 'var(--muted-foreground)', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' };
    const activeLinkStyle: React.CSSProperties = { ...linkStyle, color: 'var(--foreground)' };

    const mobileMenuButtonStyle: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--foreground)', cursor: 'pointer', zIndex: 1001 };
    const mobileNavOverlayStyle: React.CSSProperties = {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'var(--background)', zIndex: 1000,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '2rem',
        transform: isMenuOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease-in-out',
    };
    const mobileLinkStyle: React.CSSProperties = { ...linkStyle, fontSize: '1.5rem' };
    const activeMobileLinkStyle: React.CSSProperties = { ...activeLinkStyle, fontSize: '1.5rem' };

    return (
        <div>
            <header style={headerStyle}>
                <Link to="/" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', textDecoration: 'none', zIndex: 1001 }} onClick={handleLinkClick}>
                    Artflow
                </Link>

                {isMobile ? (
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={mobileMenuButtonStyle}>
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                ) : (
                    <>
                        <nav style={desktopNavStyle}>
                            <NavLink to="/artworks" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Artworks</NavLink>
                            <NavLink to="/artists" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Artists</NavLink>
                            <NavLink to="/catalogues" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Catalogues</NavLink>
                        </nav>
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                            {isLoggedIn ? (
                                <>
                                    <NotificationIcon />
                                    <Link to="/dashboard" className="button button-primary">Dashboard</Link>
                                </>
                            ) : (
                                <>
                                    <Link to="/login" className="button button-secondary">Log In</Link>
                                    <Link to="/register" className="button button-primary">Sign Up</Link>
                                </>
                            )}
                        </div>
                    </>
                )}
            </header>
            
            {isMobile && (
                 <div style={mobileNavOverlayStyle}>
                    <nav style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
                        <NavLink to="/artworks" style={({ isActive }) => isActive ? activeMobileLinkStyle : mobileLinkStyle} onClick={handleLinkClick}>Artworks</NavLink>
                        <NavLink to="/artists" style={({ isActive }) => isActive ? activeMobileLinkStyle : mobileLinkStyle} onClick={handleLinkClick}>Artists</NavLink>
                        <NavLink to="/catalogues" style={({ isActive }) => isActive ? activeMobileLinkStyle : mobileLinkStyle} onClick={handleLinkClick}>Catalogues</NavLink>
                    </nav>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)', width: '200px' }}>
                        {isLoggedIn ? (
                            <>
                                <Link to="/dashboard" className="button button-primary" style={{width: '100%'}} onClick={handleLinkClick}>Dashboard</Link>
                                <Link to="/dashboard/notifications" className="button button-secondary" style={{width: '100%'}} onClick={handleLinkClick}>Notifications</Link>
                             </>
                        ) : (
                            <>
                                <Link to="/login" className="button button-secondary" style={{width: '100%'}} onClick={handleLinkClick}>Log In</Link>
                                <Link to="/register" className="button button-primary" style={{width: '100%'}} onClick={handleLinkClick}>Sign Up</Link>
                            </>
                        )}
                    </div>
                </div>
            )}

            <main>
                <Outlet />
            </main>
        </div>
    );
};

export default MarketingLayout;