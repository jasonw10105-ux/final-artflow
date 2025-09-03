// src/components/layout/Header.tsx
import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { Menu, X, LayoutDashboard, Image, BookCopy, HandCoins, BarChart2, Users as ContactsIcon, MessageSquare, Compass, Heart, Settings, LogOut, User as ProfileIcon, FileText, TrendingUp, Map } from 'lucide-react';
import '@/styles/app.css';

const Header = () => {
    const { session, profile, signOut } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = async () => {
        await signOut();
        setIsMenuOpen(false);
        navigate('/login', { replace: true });
    };

    const dashboardBase = "/u";
    const isArtist = profile?.role === "artist" || profile?.role === "both";
    const isCollector = profile?.role === "collector" || profile?.role === "both";

    const commonNavLinks = (
        <>
            <NavLink to="/artworks" className="nav-item">Browse Art</NavLink>
            <NavLink to="/artists" className="nav-item">Browse Artists</NavLink>
            <NavLink to="/catalogues" className="nav-item">Browse Catalogues</NavLink>
        </>
    );
    
    const AllNavLinks = () => (
        <nav className="offcanvas-body" onClick={() => setIsMenuOpen(false)}>
            {isArtist && (
                <>
                    <NavLink to={`${dashboardBase}/dashboard`} className="nav-item"><LayoutDashboard size={16} /> Dashboard</NavLink>
                    <NavLink to={`${dashboardBase}/artworks`} className="nav-item"><Image size={16} /> Artworks</NavLink>
                    <NavLink to={`${dashboardBase}/catalogues`} className="nav-item"><BookCopy size={16} /> Catalogues</NavLink>
                    <NavLink to={`${dashboardBase}/sales`} className="nav-item"><HandCoins size={16} /> Sales</NavLink>
                    <NavLink to={`${dashboardBase}/messages`} className="nav-item"><MessageSquare size={16} /> Messages</NavLink>
                    <NavLink to={`${dashboardBase}/insights`} className="nav-item"><BarChart2 size={16} /> Insights</NavLink>
                    <NavLink to={`${dashboardBase}/trends`} className="nav-item"><TrendingUp size={16} /> Market Trends</NavLink>
                    <NavLink to={`${dashboardBase}/reports`} className="nav-item"><FileText size={16} /> Reports</NavLink>
                    <NavLink to={`${dashboardBase}/contacts`} className="nav-item"><ContactsIcon size={16} /> Contacts</NavLink>
                    <div className="nav-divider" />
                </>
            )}
            {isCollector && (
                 <>
                    <NavLink to={`${dashboardBase}/dashboard`} className="nav-item"><LayoutDashboard size={16} /> Dashboard</NavLink>
                    <NavLink to={`${dashboardBase}/collection`} className="nav-item"><Heart size={16} /> My Collection</NavLink>
                    <NavLink to={`${dashboardBase}/roadmap`} className="nav-item"><Map size={16} /> My Roadmap</NavLink>
                    <NavLink to={`${dashboardBase}/inquiries`} className="nav-item"><MessageSquare size={16} /> Inquiries</NavLink>
                    <div className="nav-divider" />
                </>
            )}
            {commonNavLinks}
            <div className="nav-divider" />
            {profile?.slug && <NavLink to={`/${profile.slug}`} className="nav-item"><ProfileIcon size={16} /> View Public Profile</NavLink>}
            <NavLink to={`${dashboardBase}/settings`} className="nav-item"><Settings size={16} /> Settings</NavLink>
            <button onClick={handleLogout} className="nav-item"><LogOut size={16} /> Logout</button>
        </nav>
    );

    const LoggedOutNav = () => (
        <nav className="desktop-nav">
            {commonNavLinks}
            <NavLink to="/login" className="button button-secondary">Login</NavLink>
            <NavLink to="/register" className="button button-primary">Sign Up</NavLink>
        </nav>
    );

    return (
        <>
            <header className="main-header">
                <Link to={session ? `${dashboardBase}/dashboard` : "/"} className="header-logo">
                    <img src="/logo.svg" alt="Artflow" style={{ height: '50px' }} />
                </Link>

                {session ? (
                    <div className="flex items-center gap-4">
                        <Link to={`${dashboardBase}/dashboard`} className="button button-primary hidden md:flex">My Dashboard</Link>
                        <button className="mobile-menu-toggle" onClick={() => setIsMenuOpen(true)}>
                            <Menu size={28} />
                        </button>
                    </div>
                ) : <LoggedOutNav />}
            </header>

            {isMenuOpen && (
                <>
                    <div className="offcanvas-menu-backdrop" onClick={() => setIsMenuOpen(false)}></div>
                    <div className={`offcanvas-menu ${isMenuOpen ? 'open' : ''}`}>
                        <div className="offcanvas-header">
                            <Link to={session ? `${dashboardBase}/dashboard` : "/"} className="header-logo" onClick={() => setIsMenuOpen(false)}>
                                <img src="/logo.svg" alt="Artflow" style={{ height: '50px' }}/>
                            </Link>
                            <button className="mobile-menu-toggle" onClick={() => setIsMenuOpen(false)}>
                                <X size={28} />
                            </button>
                        </div>
                        {session ? <AllNavLinks /> : <nav className="offcanvas-body" onClick={() => setIsMenuOpen(false)}><LoggedOutNav /></nav>}
                    </div>
                </>
            )}
        </>
    );
};

export default Header;