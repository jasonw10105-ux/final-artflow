// src/components/layout/Header.tsx

import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

const Header = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <header className="main-header">
            <Link to={user ? "/dashboard" : "/home"} className="logo-link">
                <img src="/logo.svg" alt="Artflow" height="40px" />
            </Link>
            <nav className="main-nav">
                {user ? (
                    <>
                        <NavLink to="/artworks" className="nav-item">Browse Art</NavLink>
                        <NavLink to="/artists" className="nav-item">Browse Artists</NavLink>
                        <div className="nav-separator"></div>
                        <NavLink to="/dashboard" className="button button-secondary">
                            My Dashboard
                        </NavLink>
                        <button onClick={handleLogout} className="button button-primary">Logout</button>
                    </>
                ) : (
                    <>
                        <NavLink to="/artworks" className="nav-item">Browse Art</NavLink>
                        <NavLink to="/artists" className="nav-item">Browse Artists</NavLink>
                        <NavLink to="/login" className="nav-item">Login</NavLink>
                        <NavLink to="/register" className="button button-primary">Register</NavLink>
                    </>
                )}
            </nav>
        </header>
    );
};

export default Header;