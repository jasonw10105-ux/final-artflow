// src/components/layout/DashboardLayout.tsx

import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { 
    Image, BookCopy, HandCoins, BarChart2, Users, Heart, MessageSquare, 
    Settings, LayoutDashboard, LogOut, Compass 
} from 'lucide-react';
import NotificationIcon from '../notifications/NotificationIcon';
import toast from 'react-hot-toast';

// NavLink for the Desktop Sidebar
const DesktopNavLink = ({ to, children }: { to: string, children: React.ReactNode }) => (
    <NavLink to={to} className="nav-link">{children}</NavLink>
);

// NavLink for the Mobile Bottom Bar
const MobileNavLink = ({ to, children }: { to: string, children: React.ReactNode }) => (
    <NavLink to={to} className="mobile-nav-link">{children}</NavLink>
);

const DashboardLayout = () => {
    const { signOut, profile } = useAuth();
    const navigate = useNavigate();
    const isArtist = profile?.role === 'artist' || profile?.role === 'both';
    const isCollector = profile?.role === 'collector' || profile?.role === 'both';

    const handleSignOut = async () => {
        const { error } = await signOut();
        if (error) {
            toast.error("Failed to log out. Please try again.");
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="dashboard-container">
            {/* --- RESTORED DESKTOP & TABLET SIDEBAR --- */}
            <aside className="desktop-sidebar">
                <div className="dashboard-logo">
                    <img src="/logo.svg" alt="Artflow" height="40px" />
                </div>
                <nav className="desktop-sidebar-nav">
                    {isArtist && (
                        <>
                            <h3 className="nav-heading">For Artists</h3>
                            <DesktopNavLink to="/artist/dashboard"><LayoutDashboard size={16} /> Dashboard</DesktopNavLink>
                            <DesktopNavLink to="/artist/artworks"><Image size={16} /> Artworks</DesktopNavLink>
                            <DesktopNavLink to="/artist/catalogues"><BookCopy size={16} /> Catalogues</DesktopNavLink>
                            <DesktopNavLink to="/artist/sales"><HandCoins size={16} /> Sales</DesktopNavLink>
                            <DesktopNavLink to="/artist/messages"><MessageSquare size={16} /> Messages</DesktopNavLink>
                            <DesktopNavLink to="/artist/insights"><BarChart2 size={16} /> Insights</DesktopNavLink>
                            <DesktopNavLink to="/artist/contacts"><Users size={16} /> Contacts</DesktopNavLink>
                        </>
                    )}
                    {isCollector && (
                         <>
                            <h3 className="nav-heading">For Collectors</h3>
                            <DesktopNavLink to="/collector/dashboard"><LayoutDashboard size={16} /> Dashboard</DesktopNavLink>
                            <DesktopNavLink to="/artworks"><Compass size={16} /> Browse Art</DesktopNavLink>
                            <DesktopNavLink to="/collector/collection"><Heart size={16} /> My Collection</DesktopNavLink>
                            <DesktopNavLink to="/collector/inquiries"><MessageSquare size={16} /> Messages</DesktopNavLink>
                            <DesktopNavLink to="/collector/insights"><BarChart2 size={16} /> Insights</DesktopNavLink>
                        </>
                    )}
                </nav>
                 <div className="desktop-sidebar-footer">
                    <hr className="nav-divider" />
                    <DesktopNavLink to={isArtist ? "/artist/settings" : "/collector/settings"}><Settings size={16} /> Settings</DesktopNavLink>
                    <button onClick={handleSignOut} className="nav-link"><LogOut size={16} /> Log Out</button>
                </div>
            </aside>

            {/* --- MAIN WRAPPER for Content --- */}
            <div className="dashboard-main-wrapper">
                <header className="dashboard-top-bar">
                    <div className="top-bar-actions">
                        <NotificationIcon />
                    </div>
                </header>
                
                <main className="main-content">
                    <Outlet />
                </main>
            </div>

            {/* --- MOBILE BOTTOM NAVIGATION --- */}
            <nav className="mobile-bottom-nav">
                {isArtist ? (
                    <>
                        <MobileNavLink to="/artist/dashboard"><LayoutDashboard size={20} /> Home</MobileNavLink>
                        <MobileNavLink to="/artist/artworks"><Image size={20} /> Artworks</MobileNavLink>
                        <MobileNavLink to="/artist/catalogues"><BookCopy size={20} /> Catalogues</MobileNavLink>
                        <MobileNavLink to="/artist/sales"><HandCoins size={20} /> Sales</MobileNavLink>
                        <MobileNavLink to="/artist/messages"><MessageSquare size={20} /> Inbox</MobileNavLink>
                    </>
                ) : ( // Collector Bar
                    <>
                        <MobileNavLink to="/collector/dashboard"><LayoutDashboard size={20} /> Home</MobileNavLink>
                        <MobileNavLink to="/artworks"><Compass size={20} /> Browse</MobileNavLink>
                        <MobileNavLink to="/collector/insights"><BarChart2 size={20} /> Insights</MobileNavLink>
                        <MobileNavLink to="/collector/inquiries"><MessageSquare size={20} /> Messages</MobileNavLink>
                        <MobileNavLink to="/collector/collection"><Heart size={20} /> Saved</MobileNavLink>
                    </>
                )}
            </nav>
        </div>
    );
};

export default DashboardLayout;