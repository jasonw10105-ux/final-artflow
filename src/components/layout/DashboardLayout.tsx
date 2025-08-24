import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { Home, Image, BookCopy, HandCoins, BarChart2, Users, Heart, MessageSquare, Settings, LayoutDashboard } from 'lucide-react';
import NotificationIcon from '../notifications/NotificationIcon';

const DesktopNavLink = ({ to, children }: { to: string, children: React.ReactNode }) => (
    <NavLink to={to} className="nav-link">
        {children}
    </NavLink>
);

const MobileNavLink = ({ to, children }: { to: string, children: React.ReactNode }) => (
    <NavLink to={to} className="mobile-nav-link">
        {children}
    </NavLink>
);

const DashboardLayout = () => {
    const { profile } = useAuth();
    const isArtist = profile?.role === 'artist' || profile?.role === 'both';
    const isCollector = profile?.role === 'collector' || profile?.role === 'both';

    return (
        <div className="dashboard-container">
            {/* --- DESKTOP SIDEBAR --- */}
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
                            <DesktopNavLink to="/artist/insights"><BarChart2 size={16} /> Insights</DesktopNavLink>
                            <DesktopNavLink to="/artist/contacts"><Users size={16} /> Contacts</DesktopNavLink>
                            <hr className="nav-divider" />
                        </>
                    )}
                    {isCollector && (
                        <>
                            <h3 className="nav-heading">For Collectors</h3>
                            <DesktopNavLink to="/collector/dashboard"><LayoutDashboard size={16} /> Dashboard</DesktopNavLink>
                            <DesktopNavLink to="/collector/collection"><Heart size={16} /> My Collection</DesktopNavLink>
                            <DesktopNavLink to="/collector/inquiries"><MessageSquare size={16} /> My Inquiries</DesktopNavLink>
                            <hr className="nav-divider" />
                        </>
                    )}
                    <div className="desktop-sidebar-footer">
                        <DesktopNavLink to={isArtist ? "/artist/settings" : "/collector/settings"}><Settings size={16} /> Settings</DesktopNavLink>
                    </div>
                </nav>
            </aside>

            {/* --- MAIN CONTENT AREA --- */}
            <main className="main-content">
                <header className="dashboard-header">
                    {/* This is where the new Notification Icon is placed */}
                    <NotificationIcon />
                </header>
                <Outlet />
            </main>

            {/* --- MOBILE BOTTOM NAVIGATION --- */}
            <nav className="mobile-bottom-nav">
                {isArtist ? (
                    <>
                        <MobileNavLink to="/artist/dashboard"><LayoutDashboard size={20} /> Dashboard</MobileNavLink>
                        <MobileNavLink to="/artist/artworks"><Image size={20} /> Artworks</MobileNavLink>
                        <MobileNavLink to="/artist/sales"><HandCoins size={20} /> Sales</MobileNavLink>
                        <MobileNavLink to="/artist/settings"><Settings size={20} /> Settings</MobileNavLink>
                    </>
                ) : (
                    <>
                        <MobileNavLink to="/collector/dashboard"><LayoutDashboard size={20} /> Dashboard</MobileNavLink>
                        <MobileNavLink to="/collector/collection"><Heart size={20} /> Collection</MobileNavLink>
                        <MobileNavLink to="/collector/inquiries"><MessageSquare size={20} /> Inquiries</MobileNavLink>
                        <MobileNavLink to="/collector/settings"><Settings size={20} /> Settings</MobileNavLink>
                    </>
                )}
            </nav>
        </div>
    );
};

export default DashboardLayout;