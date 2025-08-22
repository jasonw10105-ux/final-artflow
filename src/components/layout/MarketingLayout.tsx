// src/components/layout/MarketingLayout.tsx

import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

// Custom hook to check screen size and prevent SSR issues
const useIsMobile = (breakpoint = 768) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // This function checks the screen size and sets the state.
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };
        
        // Run on mount
        checkScreenSize();
        
        // Add listener for screen size changes
        window.addEventListener('resize', checkScreenSize);
        
        // Cleanup listener on component unmount
        return () => window.removeEventListener('resize', checkScreenSize);
    }, [breakpoint]);

    return isMobile;
};

const MarketingLayout = () => {
    const isMobile = useIsMobile();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Prevent body scroll when the mobile menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        // Cleanup function to restore scrolling when component unmounts
        return () => { document.body.style.overflow = 'auto'; };
    }, [isMenuOpen]);
    
    // Function to close the menu when a link is clicked
    const handleLinkClick = () => {
        setIsMenuOpen(false);
    };
    
    // --- STYLES ---
    const headerStyle: React.CSSProperties = {
        padding: '1rem 2rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    };

    // Desktop Nav Styles
    const desktopNavStyle: React.CSSProperties = { display: 'flex', gap: '2rem', alignItems: 'center' };
    const linkStyle: React.CSSProperties = { color: 'var(--muted-foreground)', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' };
    const activeLinkStyle: React.CSSProperties = { ...linkStyle, color: 'var(--foreground)' };

    // Mobile Menu Styles
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
                    // On mobile, show the hamburger menu icon that toggles the overlay
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={mobileMenuButtonStyle}>
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                ) : (
                    // On desktop, show the full navigation bar
                    <>
                        <nav style={desktopNavStyle}>
                            <NavLink to="/artworks" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Artworks</NavLink>
                            <NavLink to="/artists" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Artists</NavLink>
                            <NavLink to="/catalogues" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Catalogues</NavLink>
                        </nav>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <Link to="/login" className="button-secondary button">Log In</Link>
                            <Link to="/register" className="button-primary button">Sign Up</Link>
                        </div>
                    </>
                )}
            </header>
            
            {/* The mobile menu overlay, its visibility is controlled by isMenuOpen state */}
            {isMobile && (
                 <div style={mobileNavOverlayStyle}>
                    <nav style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
                        <NavLink to="/artworks" style={({ isActive }) => isActive ? activeMobileLinkStyle : mobileLinkStyle} onClick={handleLinkClick}>Artworks</NavLink>
                        <NavLink to="/artists" style={({ isActive }) => isActive ? activeMobileLinkStyle : mobileLinkStyle} onClick={handleLinkClick}>Artists</NavLink>
                        <NavLink to="/catalogues" style={({ isActive }) => isActive ? activeMobileLinkStyle : mobileLinkStyle} onClick={handleLinkClick}>Catalogues</NavLink>
                    </nav>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
                        <Link to="/login" className="button-secondary button" style={{width: '200px'}} onClick={handleLinkClick}>Log In</Link>
                        <Link to="/register" className="button-primary button" style={{width: '200px'}} onClick={handleLinkClick}>Sign Up</Link>
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