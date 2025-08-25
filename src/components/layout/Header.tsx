import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { Menu, X } from 'lucide-react';

const Header = () => {
    // CORRECTED: Use `session` for a more direct and reliable check of login status.
    const { session, signOut } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = async () => {
        await signOut();
        setIsMenuOpen(false); // Close menu on logout
        navigate('/login', { replace: true });
    };
    
    // --- Navigation Link Components ---
    const LoggedInNav = () => (
        <>
            <NavLink to="/artworks" className="nav-item">Browse Art</NavLink>
            <NavLink to="/artists" className="nav-item">Browse Artists</NavLink>
            <div className="nav-divider" />
            <NavLink to="/dashboard" className="button secondary">My Dashboard</NavLink>
            <button onClick={handleLogout} className="button primary">Logout</button>
        </>
    );

    const LoggedOutNav = () => (
        <>
            <NavLink to="/artworks" className="nav-item">Browse Art</NavLink>
            <NavLink to="/artists" className="nav-item">Browse Artists</NavLink>
            <NavLink to="/login" className="button secondary">Login</NavLink>
            <NavLink to="/register" className="button primary">Register</NavLink>
        </>
    );

    return (
        <>
            <header className="main-header">
                <Link to={session ? "/dashboard" : "/home"} className="header-logo">
                    {/* Assuming you have a logo image at this path */}
                    <img src="/logo.svg" alt="Artflow" style={{ height: '32px' }} />
                </Link>

                {/* --- Desktop Navigation --- */}
                <nav className="desktop-nav">
                    {session ? <LoggedInNav /> : <LoggedOutNav />}
                </nav>

                {/* --- Mobile Menu Toggle --- */}
                <button className="mobile-menu-toggle" onClick={() => setIsMenuOpen(true)}>
                    <Menu size={28} />
                </button>
            </header>

            {/* --- Off-Canvas Menu --- */}
            {isMenuOpen && (
                <>
                    <div className="offcanvas-menu-backdrop" onClick={() => setIsMenuOpen(false)}></div>
                    <div className={`offcanvas-menu ${isMenuOpen ? 'open' : ''}`}>
                        <div className="offcanvas-header">
                            <Link to={session ? "/dashboard" : "/home"} className="header-logo" onClick={() => setIsMenuOpen(false)}>
                                <img src="/logo.svg" alt="Artflow" style={{ height: '32px' }} />
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