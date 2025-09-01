import React, { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";
import {
  Image,
  BookCopy,
  HandCoins,
  BarChart2,
  Users,
  Heart,
  MessageSquare,
  Settings,
  LayoutDashboard,
  LogOut,
  Compass,
  MoreVertical,
} from "lucide-react";
import NotificationIcon from "../notifications/NotificationIcon";
import toast from "react-hot-toast";

const DesktopNavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <NavLink to={to} className="nav-link" end>
    {children}
  </NavLink>
);

const MobileNavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <NavLink to={to} className="mobile-nav-link" end>
    {children}
  </NavLink>
);

const DashboardLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!profile) return null;

  const isArtist = profile.role === "artist" || profile.role === "both";
  const isCollector = profile.role === "collector" || profile.role === "both";

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) toast.error("Failed to log out. Try again.");
    else navigate("/login");
  };

  const dashboardBase = "/u";

  // Routes where navigation should be hidden
  const hiddenNavPatterns = [
    /^\/u\/artworks\/new/,
    /^\/u\/artworks\/[^/]+\/edit/,
    /^\/u\/catalogues\/new/,
    /^\/u\/catalogues\/[^/]+\/edit/,
    /^\/u\/contacts\/new/,
    /^\/u\/contacts\/[^/]+\/edit/,
  ];

  const hideNavigation = hiddenNavPatterns.some((pattern) => pattern.test(location.pathname));

  return (
    <div className="dashboard-container">
      {!hideNavigation && (
        <>
          {/* Desktop Sidebar */}
          <aside className="desktop-sidebar">
            <div className="dashboard-logo">
              <img src="/logo.svg" alt="Artflow" height="60" />
            </div>
            <nav className="desktop-sidebar-nav">
              {isArtist && (
                <>
                  <DesktopNavLink to={`${dashboardBase}/dashboard`}>
                    <LayoutDashboard size={16} /> Dashboard
                  </DesktopNavLink>
                  <DesktopNavLink to={`${dashboardBase}/artworks`}>
                    <Image size={16} /> Artworks
                  </DesktopNavLink>
                  <DesktopNavLink to={`${dashboardBase}/catalogues`}>
                    <BookCopy size={16} /> Catalogues
                  </DesktopNavLink>
                  <DesktopNavLink to={`${dashboardBase}/sales`}>
                    <HandCoins size={16} /> Sales
                  </DesktopNavLink>
                  <DesktopNavLink to={`${dashboardBase}/messages`}>
                    <MessageSquare size={16} /> Messages
                  </DesktopNavLink>
                  <DesktopNavLink to={`${dashboardBase}/insights`}>
                    <BarChart2 size={16} /> Insights
                  </DesktopNavLink>
                  <DesktopNavLink to={`${dashboardBase}/contacts`}>
                    <Users size={16} /> Contacts
                  </DesktopNavLink>
                </>
              )}
              {isCollector && (
                <>
                  <DesktopNavLink to={`${dashboardBase}/dashboard`}>
                    <LayoutDashboard size={16} /> Dashboard
                  </DesktopNavLink>
                  <DesktopNavLink to={`${dashboardBase}/artworks`}>
                    <Compass size={16} /> Browse Art
                  </DesktopNavLink>
                  <DesktopNavLink to={`${dashboardBase}/collection`}>
                    <Heart size={16} /> My Collection
                  </DesktopNavLink>
                  <DesktopNavLink to={`${dashboardBase}/inquiries`}>
                    <MessageSquare size={16} /> Messages
                  </DesktopNavLink>
                </>
              )}
            </nav>

            <div className="desktop-sidebar-footer">
              <hr className="nav-divider" />
              <DesktopNavLink to={`${dashboardBase}/settings`}>
                <Settings size={16} /> Settings
              </DesktopNavLink>
              <button onClick={handleSignOut} className="nav-link">
                <LogOut size={16} /> Log Out
              </button>
              <DesktopNavLink to={`/u/${profile.slug}`}>
                <LayoutDashboard size={16} /> View Public Profile
              </DesktopNavLink>
            </div>
          </aside>

          {/* Top Bar */}
          <header className="dashboard-top-bar">
            <div className="top-bar-actions">
              <NotificationIcon />
              <div className="notification-icon-wrapper">
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                  <MoreVertical size={24} />
                </button>
                {isMobileMenuOpen && (
                  <div className="notification-panel">
                    <nav
                      className="desktop-sidebar-nav"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <DesktopNavLink to={`${dashboardBase}/settings`}>
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
        </>
      )}

      {/* Page Content */}
      <div className="dashboard-main-wrapper">
        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {!hideNavigation && (
        /* Mobile Bottom Navigation */
        <nav className="mobile-bottom-nav">
          {isArtist ? (
            <>
              <MobileNavLink to={`${dashboardBase}/dashboard`}>
                <LayoutDashboard size={20} /> Home
              </MobileNavLink>
              <MobileNavLink to={`${dashboardBase}/artworks`}>
                <Image size={20} /> Artworks
              </MobileNavLink>
              <MobileNavLink to={`${dashboardBase}/catalogues`}>
                <BookCopy size={20} /> Catalogues
              </MobileNavLink>
              <MobileNavLink to={`${dashboardBase}/sales`}>
                <HandCoins size={20} /> Sales
              </MobileNavLink>
              <MobileNavLink to={`${dashboardBase}/messages`}>
                <MessageSquare size={20} /> Inbox
              </MobileNavLink>
            </>
          ) : (
            <>
              <MobileNavLink to={`${dashboardBase}/dashboard`}>
                <LayoutDashboard size={20} /> Home
              </MobileNavLink>
              <MobileNavLink to={`${dashboardBase}/artworks`}>
                <Compass size={20} /> Browse
              </MobileNavLink>
              <MobileNavLink to={`${dashboardBase}/inquiries`}>
                <MessageSquare size={20} /> Messages
              </MobileNavLink>
              <MobileNavLink to={`${dashboardBase}/collection`}>
                <Heart size={20} /> Saved
              </MobileNavLink>
            </>
          )}
        </nav>
      )}
    </div>
  );
};

export default DashboardLayout;