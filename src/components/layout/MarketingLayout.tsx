import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

const MarketingLayout = () => {
    const headerStyle: React.CSSProperties = {
        padding: '1rem 2rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    };
    const navStyle: React.CSSProperties = {
        display: 'flex',
        gap: '2rem',
        alignItems: 'center',
    };
    const linkStyle: React.CSSProperties = {
        color: 'var(--muted-foreground)',
        textDecoration: 'none',
        fontWeight: 500,
        transition: 'color 0.2s',
    };
    const activeLinkStyle: React.CSSProperties = {
        ...linkStyle,
        color: 'var(--foreground)',
    };

    return (
        <div>
            <header style={headerStyle}>
                <nav style={navStyle}>
                    <Link to="/" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--foreground)', textDecoration: 'none' }}>
                        Artflow
                    </Link>
                    <NavLink to="/artworks" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Artworks</NavLink>
                    <NavLink to="/artists" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Artists</NavLink>
                    <NavLink to="/catalogues" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Catalogues</NavLink>
                </nav>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link to="/login" className="button-secondary button">Log In</Link>
                    <Link to="/register" className="button-primary button">Sign Up</Link>
                </div>
            </header>
            <main>
                {/* This is where the specific page component will be rendered */}
                <Outlet />
            </main>
        </div>
    );
};

export default MarketingLayout;