// src/components/layout/Header.tsx

import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { Menu, X } from 'lucide-react'; // Using icons for the toggle

const Header = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsMenuOpen(false); // Close menu on logout
        navigate('/login', { replace: true });
    };
    
    // --- Define Navigation Links Once to Avoid Repetition ---

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
                <Link to={user ? "/dashboard" : "/"} className="header-logo">
                    <img src="/logo.svg" alt="Artflow" />
                </Link>

                {/* --- Desktop Navigation --- */}
                <nav className="desktop-nav">
                    {user ? <LoggedInNav /> : <LoggedOutNav />}
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
                            <Link to={user ? "/dashboard" : "/"} className="header-logo" onClick={() => setIsMenuOpen(false)}>
                                <img src="/logo.svg" alt="Artflow" />
                            </Link>
                            <button className="mobile-menu-toggle" onClick={() => setIsMenuOpen(false)}>
                                <X size={28} />
                            </button>
                        </div>
                        <nav className="offcanvas-body">
                            {user ? <LoggedInNav /> : <LoggedOutNav />}
                        </nav>
                    </div>
                </>
            )}
        </>
    );
};

export default Header;