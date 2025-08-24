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
        // Use replace to prevent the user from going back to a protected page
        navigate('/login', { replace: true });
    };

    // Basic styles for nav items, you can move these to a CSS file
    const navItemStyle = {
        padding: '0.5rem 1rem',
        textDecoration: 'none',
        color: 'var(--foreground)',
        borderRadius: 'var(--radius)',
        transition: 'background 0.2s',
    };

    const activeStyle = {
        background: 'var(--accent)',
        fontWeight: '500',
    };

    return (
        <header style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '1rem 2rem', 
            borderBottom: '1px solid var(--border)',
            background: 'var(--card)'
        }}>
            <Link to={user ? "/dashboard" : "/home"} style={{ display: 'flex', alignItems: 'center' }}>
                <img src="/logo.svg" alt="Artflow" height="40px" />
            </Link>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {user ? (
                    // --- LOGGED-IN NAVIGATION ---
                    <>
                        <NavLink 
                            to="/artworks" 
                            style={({ isActive }) => isActive ? {...navItemStyle, ...activeStyle} : navItemStyle}
                        >
                            Browse Art
                        </NavLink>
                        <NavLink 
                            to="/artists" 
                            style={({ isActive }) => isActive ? {...navItemStyle, ...activeStyle} : navItemStyle}
                        >
                            Browse Artists
                        </NavLink>
                        <div style={{width: '1px', height: '24px', background: 'var(--border)'}}></div>
                        <NavLink to="/dashboard" className="button button-secondary">
                            My Dashboard
                        </NavLink>
                        <button onClick={handleLogout} className="button button-primary">Logout</button>
                    </>
                ) : (
                    // --- LOGGED-OUT NAVIGATION ---
                    <>
                        <NavLink 
                            to="/artworks" 
                            style={({ isActive }) => isActive ? {...navItemStyle, ...activeStyle} : navItemStyle}
                        >
                            Browse Art
                        </NavLink>
                        <NavLink 
                            to="/artists" 
                            style={({ isActive }) => isActive ? {...navItemStyle, ...activeStyle} : navItemStyle}
                        >
                            Browse Artists
                        </NavLink>
                        <NavLink to="/login" className="button button-secondary">Login</NavLink>
                        <NavLink to="/register" className="button button-primary">Register</NavLink>
                    </>
                )}
            </nav>
        </header>
    );
};

export default Header;