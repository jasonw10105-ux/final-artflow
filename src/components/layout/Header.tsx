import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { Menu, X } from 'lucide-react';

const Header = () => {
    const { session, profile, signOut } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = async () => {
        await signOut();
        setIsMenuOpen(false);
        navigate('/login', { replace: true });
    };

    // Determine dashboard path based on role
    const dashboardPath = (() => {
        if (!profile) return "/dashboard";
        if (profile.role === "artist") return "/artist/dashboard";
        if (profile.role === "collector") return "/collector/dashboard";
        if (profile.role === "both") return "/artist/dashboard"; // or "/dashboard" if you create that route
        return "/dashboard";
    })();

    const LoggedInNav = () => (
        <>
            <NavLink to="/artworks" className="nav-item">Browse Art</NavLink>
            <NavLink to="/artists" className="nav-item">Browse Artists</NavLink>
            <NavLink to="/catalogues" className="nav-item">Browse Catalogues</NavLink>
            <div className="nav-divider" />
            <NavLink to={dashboardPath} className="button secondary">My Dashboard</NavLink>
            <button onClick={handleLogout} className="button primary">Logout</button>
        </>
    );

    const LoggedOutNav = () => (
        <>
            <NavLink to="/artworks" className="nav-item">Browse Art</NavLink>
            <NavLink to="/artists" className="nav-item">Browse Artists</NavLink>
            <NavLink to="/catalogues" className="nav-item">Browse Catalogues</NavLink>
            <NavLink to="/login" className="button secondary">Login</NavLink>
            <NavLink to="/register" className="button primary">Register</NavLink>
        </>
    );

    return (
        <>
            <header className="main-header">
                <Link to={session ? dashboardPath : "/home"} className="header-logo">
                    <img src="/logo.svg" alt="Artflow" style={{ height: '50px' }} />
                </Link>

                <nav className="desktop-nav">
                    {session ? <LoggedInNav /> : <LoggedOutNav />}
                </nav>

                <button className="mobile-menu-toggle" onClick={() => setIsMenuOpen(true)}>
                    <Menu size={28} />
                </button>
            </header>

            {isMenuOpen && (
                <>
                    <div className="offcanvas-menu-backdrop" onClick={() => setIsMenuOpen(false)}></div>
                    <div className={`offcanvas-menu ${isMenuOpen ? 'open' : ''}`}>
                        <div className="offcanvas-header">
                            <Link to={session ? dashboardPath : "/home"} className="header-logo" onClick={() => setIsMenuOpen(false)}>
                                <img src="/logo.svg" alt="Artflow" style={{ height: '50px' }}/>
                            </Link>
                            <button className="mobile-menu-toggle" onClick={() => setIsMenuOpen(false)}>
                                <X size={28} />
                            </button>
                        </div>
                        <nav className="offcanvas-body" onClick={() => setIsMenuOpen(false)}>
                            {session ? <LoggedInNav /> : <LoggedOutNav />}
                        </nav>
                    </div>
                </>
            )}
        </>
    );
};

export default Header;