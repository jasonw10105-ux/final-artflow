import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import {
  Image, BookCopy, HandCoins, BarChart2, Users, Heart, MessageSquare,
  Settings, LayoutDashboard, LogOut, Compass, MoreVertical
} from 'lucide-react';
import NotificationIcon from '../notifications/NotificationIcon';
import toast from 'react-hot-toast';

const DesktopNavLink = ({ to, children }: { to: string, children: React.ReactNode }) => (
  <NavLink to={to} className="nav-link" end>{children}</NavLink>
);

const MobileNavLink = ({ to, children }: { to: string, children: React.ReactNode }) => (
  <NavLink to={to} className="mobile-nav-link" end>{children}</NavLink>
);

const DashboardLayout = () => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const isArtist = profile?.role === 'artist' || profile?.role === 'both';
  const isCollector = profile?.role === 'collector' || profile?.role === 'both';

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      <aside className="desktop-sidebar">
        <div className="dashboard-logo">
          <img src="/logo.svg" alt="Artflow" height="40" />
        </div>

        <nav className="desktop-sidebar-nav">
          {/* Artist nav links */}
          {isArtist && (
            <>
              <DesktopNavLink to="/dashboard"><LayoutDashboard size={16} /> Dashboard</DesktopNavLink>
              <DesktopNavLink to="/artworks"><Image size={16} /> Artworks</DesktopNavLink>
              <DesktopNavLink to="/catalogues"><BookCopy size={16} /> Catalogues</DesktopNavLink>
              <DesktopNavLink to="/sales"><HandCoins size={16} /> Sales</DesktopNavLink>
              <DesktopNavLink to="/messages"><MessageSquare size={16} /> Messages</DesktopNavLink>
              <DesktopNavLink to="/insights"><BarChart2 size={16} /> Insights</DesktopNavLink>
              <DesktopNavLink to="/contacts"><Users size={16} /> Contacts</DesktopNavLink>
            </>
          )}

          {/* Collector nav links */}
          {isCollector && (
            <>
              <DesktopNavLink to="/dashboard"><LayoutDashboard size={16} /> Dashboard</DesktopNavLink>
              <DesktopNavLink to="/explore"><Compass size={16} /> Explore</DesktopNavLink>
              <DesktopNavLink to="/favorites"><Heart size={16} /> Favorites</DesktopNavLink>
              <DesktopNavLink to="/inquiries"><MessageSquare size={16} /> Messages</DesktopNavLink>
              <DesktopNavLink to="/collection"><HandCoins size={16} /> Collection</DesktopNavLink>
              <DesktopNavLink to="/sales"><HandCoins size={16} /> Sales</DesktopNavLink>
            </>
          )}
        </nav>

        <div className="desktop-sidebar-footer">
          <hr className="nav-divider" />
          <DesktopNavLink to="/settings">
            <Settings size={16} /> Settings
          </DesktopNavLink>
          <button onClick={handleSignOut} className="nav-link">
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </aside>

      <div className="dashboard-main-wrapper">
        <header className="dashboard-top-bar">
          <div className="top-bar-actions">
            <NotificationIcon />
            <div className="notification-icon-wrapper">
              <button
                className="notification-icon-button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle menu"
              >
                <MoreVertical size={24} />
              </button>
              {isMobileMenuOpen && (
                <div className="notification-panel" style={{ width: '220px', maxHeight: 'none' }}>
                  <nav
                    className="desktop-sidebar-nav"
                    style={{ padding: '0.5rem' }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <h3 className="nav-heading" style={{ padding: '0 0.5rem', marginTop: 0 }}>Menu</h3>

                    {/* Full role-specific links in offcanvas menu */}
                    {isArtist && (
                      <>
                        <DesktopNavLink to="/dashboard"><LayoutDashboard size={16} /> Dashboard</DesktopNavLink>
                        <DesktopNavLink to="/artworks"><Image size={16} /> Artworks</DesktopNavLink>
                        <DesktopNavLink to="/catalogues"><BookCopy size={16} /> Catalogues</DesktopNavLink>
                        <DesktopNavLink to="/sales"><HandCoins size={16} /> Sales</DesktopNavLink>
                        <DesktopNavLink to="/messages"><MessageSquare size={16} /> Messages</DesktopNavLink>
                        <DesktopNavLink to="/insights"><BarChart2 size={16} /> Insights</DesktopNavLink>
                        <DesktopNavLink to="/contacts"><Users size={16} /> Contacts</DesktopNavLink>
                      </>
                    )}

                    {isCollector && (
                      <>
                        <DesktopNavLink to="/dashboard"><LayoutDashboard size={16} /> Dashboard</DesktopNavLink>
                        <DesktopNavLink to="/explore"><Compass size={16} /> Explore</DesktopNavLink>
                        <DesktopNavLink to="/favorites"><Heart size={16} /> Favorites</DesktopNavLink>
                        <DesktopNavLink to="/inquiries"><MessageSquare size={16} /> Messages</DesktopNavLink>
                        <DesktopNavLink to="/collection"><HandCoins size={16} /> Collection</DesktopNavLink>
                        <DesktopNavLink to="/sales"><HandCoins size={16} /> Sales</DesktopNavLink>
                      </>
                    )}

                    <hr className="nav-divider" />

                    <DesktopNavLink to="/settings">
                      <Settings size={16} /> Settings
                    </DesktopNavLink>
                    <button onClick={handleSignOut} className="nav-link">
                      <LogOut size={16} /> Log Out
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>

      <nav className="mobile-bottom-nav">
        {isArtist && (
          <>
            <MobileNavLink to="/dashboard"><LayoutDashboard size={20} /> Home</MobileNavLink>
            <MobileNavLink to="/artworks"><Image size={20} /> Artworks</MobileNavLink>
            <MobileNavLink to="/catalogues"><BookCopy size={20} /> Catalogues</MobileNavLink>
            <MobileNavLink to="/messages"><MessageSquare size={20} /> Inbox</MobileNavLink>
            <MobileNavLink to="/insights"><BarChart2 size={20} /> Insights</MobileNavLink>
          </>
        )}

        {isCollector && (
          <>
            <MobileNavLink to="/dashboard"><LayoutDashboard size={20} /> Home</MobileNavLink>
            <MobileNavLink to="/explore"><Compass size={20} /> Explore</MobileNavLink>
            <MobileNavLink to="/favorites"><Heart size={20} /> Favorites</MobileNavLink>
            <MobileNavLink to="/inquiries"><MessageSquare size={20} /> Inbox</MobileNavLink>
            <MobileNavLink to="/sales"><HandCoins size={20} /> Sales</MobileNavLink>
          </>
        )}
      </nav>
    </div>
  );
};

export default DashboardLayout;
