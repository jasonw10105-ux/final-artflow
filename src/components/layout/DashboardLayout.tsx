// src/components/layout/DashboardLayout.tsx
import React from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";
import {
  Image, BookCopy, HandCoins, BarChart2, Users, Heart, MessageSquare,
  Settings, LayoutDashboard, LogOut, Compass, User as ProfileIcon,
  FileText, TrendingUp, Map
} from "lucide-react";
import Header from "./Header";

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
    return null;
  }

  const isArtist = profile.role === "artist" || profile.role === "both";
  const isCollector = profile.role === "collector" || profile.role === "both";
  const dashboardBase = "/u";

  const hideSidebarPatterns = [
    /^\/u\/artworks\/wizard/,
    /^\/u\/catalogues\/new/,
    /^\/u\/catalogues\/edit\/.+/,
  ];
  
  const hideSidebar = hideSidebarPatterns.some((pattern) => pattern.test(location.pathname));

  return (
    <>
      <Header />
      <div className="dashboard-container">
        {!hideSidebar && (
          <aside className="desktop-sidebar">
            <nav className="desktop-sidebar-nav">
              {isArtist && (
                <>
                  <DesktopNavLink to={`${dashboardBase}/dashboard`}><LayoutDashboard size={16} /> Dashboard</DesktopNavLink>
                  <DesktopNavLink to={`${dashboardBase}/artworks`}><Image size={16} /> Artworks</DesktopNavLink>
                  <DesktopNavLink to={`${dashboardBase}/catalogues`}><BookCopy size={16} /> Catalogues</DesktopNavLink>
                  <DesktopNavLink to={`${dashboardBase}/sales`}><HandCoins size={16} /> Sales</DesktopNavLink>
                  <DesktopNavLink to={`${dashboardBase}/messages`}><MessageSquare size={16} /> Messages</DesktopNavLink>
                  <DesktopNavLink to={`${dashboardBase}/insights`}><BarChart2 size={16} /> Insights</DesktopNavLink>
                  <DesktopNavLink to={`${dashboardBase}/trends`}><TrendingUp size={16} /> Market Trends</DesktopNavLink>
                  <DesktopNavLink to={`${dashboardBase}/reports`}><FileText size={16} /> Reports</DesktopNavLink>
                  <DesktopNavLink to={`${dashboardBase}/contacts`}><Users size={16} /> Contacts</DesktopNavLink>
                </>
              )}
              {isCollector && (
                <>
                  <DesktopNavLink to={`${dashboardBase}/dashboard`}><LayoutDashboard size={16} /> Dashboard</DesktopNavLink>
                  <DesktopNavLink to="/artworks"><Compass size={16} /> Explore Art</DesktopNavLink>
                  <DesktopNavLink to={`${dashboardBase}/collection`}><Heart size={16} /> My Collection</DesktopNavLink>
                  <DesktopNavLink to={`${dashboardBase}/roadmap`}><Map size={16} /> My Roadmap</DesktopNavLink>
                  <DesktopNavLink to={`${dashboardBase}/inquiries`}><MessageSquare size={16} /> Inquiries</DesktopNavLink>
                </>
              )}
            </nav>
            <div className="desktop-sidebar-footer">
              <hr className="nav-divider" />
              {profile.slug && <DesktopNavLink to={`/${profile.slug}`}><ProfileIcon size={16}/> View Public Profile</DesktopNavLink>}
              <DesktopNavLink to={`${dashboardBase}/settings`}><Settings size={16} /> Settings</DesktopNavLink>
              <button onClick={() => signOut().then(() => navigate('/login'))} className="nav-link"><LogOut size={16} /> Log Out</button>
            </div>
          </aside>
        )}
        <div className="dashboard-main-wrapper">
          <main className="main-content">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
};

export default DashboardLayout;