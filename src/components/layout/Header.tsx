import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Menu, X } from 'lucide-react';
import { Session } from '@supabase/supabase-js'; // Import Session type

// CORRECTED: Define props for the component
interface HeaderProps {
    session: Session | null;
}

const Header = ({ session }: HeaderProps) => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsMenu-Open(false);
        navigate('/login', { replace: true });
    };

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
                <Link to={session ? "/dashboard" : "/"} className="header-logo">
                    <img src="/logo.svg" alt="Artflow" />
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
                            <Link to={session ? "/dashboard" : "/"} className="header-logo" onClick={() => setIsMenuOpen(false)}>
                                <img src="/logo.svg" alt="Artflow" />
                            </Link>
                            <button className="mobile-menu-toggle" onClick={() => setIsMenuOpen(false)}>
                                <X size={28} />
                            </button>
                        </div>
                        <nav className="offcanvas-body">
                            {session ? <LoggedInNav /> : <LoggedOutNav />}
                        </nav>
                    </div>
                </>
            )}
        </>
    );
};

export default Header;