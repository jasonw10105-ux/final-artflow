import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthProvider';
import NotificationIcon from '../notifications/NotificationIcon';

const useIsMobile = (breakpoint = 768) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);
    useEffect(() => {
        const checkScreenSize = () => setIsMobile(window.innerWidth < breakpoint);
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
        document.body.style.overflow = isMenuOpen ? 'hidden' : 'auto';
        return () => { document.body.style.overflow = 'auto'; };
    }, [isMenuOpen]);
    
    const handleLinkClick = () => setIsMenuOpen(false);
    
    const navLinkClasses = ({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? 'active' : ''}`;

    return (
        <div>
            <header className="marketing-header">
                <Link to="/"><img src="/logo.svg" alt="Artflow" height="40px" /></Link>
                {isMobile ? (
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="mobile-menu-button">
                        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                ) : (
                    <>
                        <nav className="marketing-nav-desktop">
                            <NavLink to="/artworks" className={navLinkClasses}>Artworks</NavLink>
                            <NavLink to="/artists" className={navLinkClasses}>Artists</NavLink>
                            <NavLink to="/catalogues" className={navLinkClasses}>Catalogues</NavLink>
                        </nav>
                        <div className="marketing-header-actions">
                            {isLoggedIn ? (
                                <>
                                    <NotificationIcon />
                                    <Link to="/artist/dashboard" className="button button-primary">Dashboard</Link>
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
            
            <div className={`marketing-nav-mobile ${isMenuOpen ? 'open' : ''}`}>
                <nav>
                    <NavLink to="/artworks" className={navLinkClasses} onClick={handleLinkClick}>Artworks</NavLink>
                    <NavLink to="/artists" className={navLinkClasses} onClick={handleLinkClick}>Artists</NavLink>
                    <NavLink to="/catalogues" className={navLinkClasses} onClick={handleLinkClick}>Catalogues</NavLink>
                </nav>
                <div className="marketing-nav-mobile-actions">
                    {isLoggedIn ? (
                        <>
                            <Link to="/artist/dashboard" className="button button-primary" style={{width: '100%'}} onClick={handleLinkClick}>Dashboard</Link>
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

            <main>
                <Outlet />
            </main>
        </div>
    );
};

export default MarketingLayout;