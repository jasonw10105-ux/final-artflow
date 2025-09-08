// src/components/layout/DashboardLayout.tsx
import React, { useMemo } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";
import {
  Image, BookCopy, HandCoins, BarChart2, Users, Heart, MessageSquare,
  Settings, LayoutDashboard, LogOut, Compass, User as ProfileIcon,
  FileText, TrendingUp, Map, CalendarDays, Rocket, Mail, DollarSign
} from "lucide-react";
import Header, { navConfig as headerNavConfig, NavItem } from "./Header"; // Import navConfig and NavItem from Header
import MobileBottomNavBar from './MobileBottomNavBar'; // Ensure MobileBottomNavBar is imported

const DesktopNavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <NavLink to={to} className="nav-link" end>
    {children}
  </NavLink>
);

const DashboardLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!profile) {
    // If profile is not loaded or user is not authenticated, redirect to login
    // This should ideally be caught by ProtectedRoute, but as a safeguard:
    navigate('/login', { replace: true });
    return null;
  }

  const userRole = profile.role;
  const dashboardBase = "/u";

  const hideSidebarPatterns = [
    /^\/u\/artworks\/wizard/,
    /^\/u\/catalogues\/new/,
    /^\/u\/catalogues\/edit\/.+/,
    /^\/u\/artworks\/new/, // Corrected path from /u/artworks/new_artwork to /u/artworks/new based on ArtworkListPage
    /^\/u\/artworks\/edit\/.+/,
    /^\/u\/contacts\/new/,
    /^\/u\/contacts\/edit\/.+/,
  ];
  
  const hideSidebar = hideSidebarPatterns.some((pattern) => pattern.test(location.pathname));

  // FILTERED NAVIGATION ITEMS FOR SIDEBAR - MOVED OUTSIDE CONDITIONAL
  const filteredSidebarNav = useMemo(() => {
    return headerNavConfig.filter(item => {
      // 1. Must require authentication and have a role defined
      if (!item.authRequired || !item.roles) return false;

      // 2. Role check: must match current user's role
      if (!item.roles.includes(userRole as any)) return false;

      // 3. Custom condition check: if it exists and returns false, hide it
      if (item.condition && !item.condition(profile)) return false;

      // 4. Contextual filtering for sidebar:
      // Show dashboard links (/u/...) or the public "/artworks" for collectors
      const isDashboardLink = item.to.startsWith(dashboardBase);
      const isExploreArtForCollector = item.to === '/artworks' && (userRole === "collector" || userRole === "both");
      
      return isDashboardLink || isExploreArtForCollector;
    }).sort((a, b) => {
      // Custom sorting for sidebar: Dashboard first, then Explore Art, then others
      if (a.to === `${dashboardBase}/dashboard`) return -1;
      if (b.to === `${dashboardBase}/dashboard`) return 1;
      if (a.to === "/artworks") return -1; // Place "Explore Art" after Dashboard
      if (b.to === "/artworks") return 1;
      return 0;
    });
  }, [userRole, profile]); // Dependencies are `userRole` and `profile`


  return (
    <>
      <Header />
      <div className="dashboard-container">
        {!hideSidebar && (
          <aside className="desktop-sidebar">
            <nav className="desktop-sidebar-nav">
              {filteredSidebarNav.map(item => (
                <DesktopNavLink key={item.to} to={typeof item.actualTo === 'function' ? item.actualTo(profile) : item.to}>
                  {item.icon && <span className="nav-icon">{item.icon}</span>}
                  {item.label}
                </DesktopNavLink>
              ))}
            </nav>
          </aside>
        )}
        <div className="dashboard-main-wrapper">
          <main className="main-content">
            <Outlet />
          </main>
          <MobileBottomNavBar /> {/* Render the mobile bottom nav bar */}
        </div>
      </div>
    </>
  );
};

export default DashboardLayout;