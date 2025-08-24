// src/components/layout/DashboardLayout.tsx

import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import { Home, Image, BookCopy, HandCoins, BarChart2, Users, Heart, MessageSquare, Settings, LayoutDashboard } from 'lucide-react';

// --- STYLES FOR RESPONSIVE LAYOUT ---
// This CSS is included directly for simplicity. You can move it to a .css file.
const style = `
.dashboard-container {
    display: flex;
    min-height: 100vh;
    background: var(--background);
}

/* DESKTOP SIDEBAR */
.desktop-sidebar {
    width: 250px;
    background: var(--card);
    padding: 1.5rem;
    border-right: 1px solid var(--border);
    display: none; /* Hidden by default */
}

/* MOBILE BOTTOM NAV */
.mobile-bottom-nav {
    display: flex; /* Shown by default for mobile-first */
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: var(--card);
    border-top: 1px solid var(--border);
    justify-content: space-around;
    align-items: center;
    z-index: 1000;
}

.main-content {
    flex: 1;
    padding: 2rem;
    padding-bottom: 80px; /* Add padding to prevent content from hiding behind mobile nav */
    overflow-y: auto;
}

.nav-link {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 1rem;
    text-decoration: none;
    border-radius: var(--radius);
    color: var(--foreground);
    transition: background 0.2s;
}
.nav-link.active {
    background: var(--primary);
    color: var(--primary-foreground);
}
.nav-link:hover:not(.active) {
    background: var(--accent);
}

.mobile-nav-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.7rem;
    color: var(--muted-foreground);
    text-decoration: none;
}
.mobile-nav-link.active {
    color: var(--primary);
}

/* Media query for desktop screens */
@media (min-width: 768px) {
    .desktop-sidebar {
        display: flex; /* Show sidebar on desktop */
        flex-direction: column;
    }
    .mobile-bottom-nav {
        display: none; /* Hide bottom nav on desktop */
    }
    .main-content {
        padding-bottom: 2rem; /* Reset bottom padding on desktop */
    }
}
`;

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
        <>
            <style>{style}</style>
            <div className="dashboard-container">
                {/* --- DESKTOP SIDEBAR --- */}
                <aside className="desktop-sidebar">
                    <div style={{ marginBottom: '2rem' }}>
                        <img src="/logo.svg" alt="Artflow" height="40px" />
                    </div>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1 }}>
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
                        <div style={{ marginTop: 'auto' }}>
                            <DesktopNavLink to={isArtist ? "/artist/settings" : "/collector/settings"}><Settings size={16} /> Settings</DesktopNavLink>
                        </div>
                    </nav>
                </aside>

                {/* --- MAIN CONTENT AREA --- */}
                <main className="main-content">
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
        </>
    );
};

export default DashboardLayout;