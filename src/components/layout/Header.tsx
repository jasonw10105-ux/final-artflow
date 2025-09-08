import React, { useState, useCallback, useMemo } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import {
    Menu, X, LayoutDashboard, Image, BookCopy, HandCoins, BarChart2, Users as ContactsIcon, MessageSquare,
    Compass, Heart, Settings, LogOut, User as ProfileIcon, FileText, CalendarDays, Rocket, Mail, DollarSign, Bell
} from 'lucide-react';
import '@/styles/app.css';
import { AppProfile } from '@/types/app.types'; // CORRECTED: Import from app.types.ts

// Define navigation item structure
export interface NavItem {
    to: string;
    label: string;
    icon?: React.ReactNode;
    roles?: ('artist' | 'collector' | 'both' | 'anon')[]; // Added 'anon' for public links
    dividerAfter?: boolean;
    authRequired?: boolean;
    condition?: (profile: AppProfile | null) => boolean;
    actualTo?: (profile: AppProfile | null) => string;
}

// Centralized navigation configuration
export const navConfig: NavItem[] = [
    // Public Nav Links (visible when logged out or in, in the main header)
    { to: "/artworks", label: "Browse Art", icon: <Compass size={16} />, authRequired: false, roles: ["anon", "artist", "both", "collector"] },
    { to: "/artists", label: "Browse Artists", authRequired: false, roles: ["anon", "artist", "both", "collector"] },
    { to: "/catalogues", label: "Browse Catalogues", authRequired: false, roles: ["anon", "artist", "both", "collector"] },
    { to: "/explore/community-curations", label: "Community Curations", authRequired: false, roles: ["anon", "artist", "both", "collector"], dividerAfter: true },

    // Dashboard Links - applicable for both desktop dropdown and mobile offcanvas, and sidebar
    { to: "/u/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} />, roles: ["artist", "both", "collector"], authRequired: true },

    // Artist-specific Dashboard Links
    { to: "/u/artworks", label: "Artworks", icon: <Image size={16} />, roles: ["artist", "both"], authRequired: true },
    { to: "/u/catalogues", label: "Catalogues", icon: <BookCopy size={16} />, roles: ["artist", "both"], authRequired: true },
    { to: "/u/sales", label: "Sales", icon: <HandCoins size={16} />, roles: ["artist", "both"], authRequired: true },
    { to: "/u/messages", label: "Messages", icon: <MessageSquare size={16} />, roles: ["artist", "both"], authRequired: true },
    { to: "/u/calendar", label: "Calendar", icon: <CalendarDays size={16} />, roles: ["artist", "both"], authRequired: true },
    // The 'Comms' page was commented out in App.tsx, so it's also commented out here.
    // { to: "/u/comms", label: "Comms", icon: <Mail size={16} />, roles: ["artist", "both"], authRequired: true },
    { to: "/u/insights", label: "Insights", icon: <BarChart2 size={16} />, roles: ["artist", "both"], authRequired: true },
    // { to: "/u/trends", label: "Market Trends", icon: <TrendingUp size={16} />, roles: ["artist", "both"], authRequired: true }, // REMOVED: Market Trends from navConfig
    { to: "/u/reports", label: "Reports", icon: <FileText size={16} />, roles: ["artist", "both"], authRequired: true },
    { to: "/u/contacts", label: "Contacts", icon: <ContactsIcon size={16} />, roles: ["artist", "both"], authRequired: true, dividerAfter: true },

    // Collector-specific Dashboard Links
    { to: "/u/collection", label: "My Collection", icon: <Heart size={16} />, roles: ["collector", "both"], authRequired: true },
    { to: "/u/vault", label: "My Vault", icon: <Rocket size={16} />, roles: ["collector", "both"], authRequired: true },
    { to: "/u/favorites", label: "Favorites", icon: <Heart size={16} />, roles: ["collector", "both"], authRequired: true },
    { to: "/u/roadmap", label: "My Roadmap", icon: <Map size={16} />, roles: ["collector", "both"], authRequired: true },
    { to: "/u/inquiries", label: "Inquiries", icon: <MessageSquare size={16} />, roles: ["collector", "both"], authRequired: true },
    { to: "/u/sales-history", label: "Sales History", icon: <DollarSign size={16} />, roles: ["collector", "both"], authRequired: true, dividerAfter: true },

    // User Profile & Settings (always authRequired)
    {
      to: "#", // Default/fallback for NavLink, actualTo will provide dynamic path
      label: "View Public Profile",
      icon: <ProfileIcon size={16} />,
      authRequired: true,
      roles: ["artist", "collector", "both"],
      condition: (p) => !!p?.slug,
      actualTo: (p) => p?.slug ? `/u/${p.slug}` : '#'
    },
    { to: "/u/settings", label: "Settings", icon: <Settings size={16} />, authRequired: true, roles: ["artist", "both", "collector"] },
];

type NavContext = 'public-logged-out' | 'public-logged-in' | 'dashboard-header-desktop' | 'mobile-menu'; // Renamed for clarity

const Header = () => {
    const { session, profile, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = async () => {
        await signOut();
        setIsMenuOpen(false);
        navigate('/start', { replace: true });
    };

    const dashboardBase = "/u";
    const isLoggedIn = !!session;
    const isDashboardRoute = location.pathname.startsWith(dashboardBase);
    const userRole = profile?.role || 'anon'; // Default to 'anon' if not logged in

    const filterNavItems = useCallback((
        context: NavContext,
        currentProfile: AppProfile | null // Ensure AppProfile is passed
    ): NavItem[] => {
        return navConfig.filter(item => {
            const itemRoles = item.roles || []; // Ensure item.roles is an array
            
            // Check if item is relevant for current user's role (or anon for public links)
            const isRoleRelevant = itemRoles.includes(userRole);

            // Authentication check
            const isAuthRelevant = (!item.authRequired && userRole === 'anon') || (item.authRequired && isLoggedIn);

            if (!isRoleRelevant || !isAuthRelevant) return false;

            // Custom condition check (e.g., if profile slug exists)
            if (item.condition && !item.condition(currentProfile)) {
                return false;
            }

            const isDashboardLink = item.to.startsWith(dashboardBase);

            switch (context) {
                case 'public-logged-out':
                    // Show only non-auth-required, non-dashboard links for logged out users
                    return !item.authRequired && !isDashboardLink;
                case 'public-logged-in':
                    // For logged-in users on public pages, show non-auth-required, non-dashboard links
                    return !item.authRequired && !isDashboardLink;
                case 'dashboard-header-desktop':
                    // The minimal desktop dashboard header does not render items from navConfig.
                    // It renders specific icons/dropdown directly (Notification, Settings, Profile Dropdown).
                    // So, return false for all navConfig items here.
                    return false; 
                case 'mobile-menu':
                    // Mobile menu combines public and dashboard links based on login status and role
                    if (isLoggedIn) {
                        // For logged-in users, mobile menu shows all relevant auth-required links
                        return item.authRequired;
                    } else {
                        // For logged-out users, mobile menu shows only public links
                        return !item.authRequired;
                    }
                default:
                    return false;
            }
        });
    }, [isLoggedIn, profile, userRole]); // Re-evaluate if login status or profile/role changes

    const renderNavLinks = useCallback((isMobileMenu: boolean, items: NavItem[]) => {
        return items.map((item) => {
            const actualToPath = item.actualTo ? item.actualTo(profile as AppProfile) : item.to;

            if (actualToPath === '#' || !actualToPath) return null;

            return (
                <React.Fragment key={item.to}>
                    <NavLink
                        to={actualToPath}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => isMobileMenu && setIsMenuOpen(false)}
                        target={item.label === "View Public Profile" ? "_blank" : undefined}
                        rel={item.label === "View Public Profile" ? "noopener noreferrer" : undefined}
                    >
                        {item.icon && <span className="nav-icon">{item.icon}</span>}
                        {item.label}
                    </NavLink>
                    {item.dividerAfter && <div className="nav-divider" />}
                </React.Fragment>
            );
        });
    }, [profile]);

    const DesktopLoggedInPublicNav = () => { // For logged-in users on public desktop pages
        const publicLinksForHeader = filterNavItems('public-logged-in', profile as AppProfile);
        return (
            <nav className="desktop-nav">
                {renderNavLinks(false, publicLinksForHeader)}
                <NavLink to="/u/dashboard" className="button button-primary ml-auto">My Dashboard</NavLink>
            </nav>
        );
    };

    const DesktopLoggedInDashboardTopBar = () => { // For logged-in users on dashboard desktop pages (matches image)
        return (
            <div className="dashboard-top-actions desktop-only"> {/* Added desktop-only */}
                <button className="button-icon" title="Notifications">
                    <Bell size={20} />
                </button>
                
                {/* Profile Info and Links */}
                <div className="profile-info-container relative group"> {/* Changed to div, not a button for image display */}
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Profile" className="profile-avatar-sm" />
                    ) : (
                        <ProfileIcon size={20} className="profile-avatar-sm-placeholder" />
                    )}
                    <span className="font-semibold text-sm desktop-only-text">{profile?.full_name || 'My Account'}</span>
                    
                    {/* The actual dropdown menu for profile-related actions */}
                    <div className="dropdown-menu dropdown-menu-right">
                        <div className="dropdown-header">
                            <p className="font-semibold">{profile?.full_name}</p>
                            <p className="text-muted-foreground text-sm">{profile?.email}</p>
                        </div>
                        <div className="nav-divider" />
                        {profile?.slug && (
                            <NavLink to={`/u/${profile.slug}`} target="_blank" rel="noopener noreferrer" className="dropdown-item" onClick={() => setIsMenuOpen(false)}>
                                <ProfileIcon size={16} /> View Public Profile
                            </NavLink>
                        )}
                        <NavLink to="/u/settings" className="dropdown-item" onClick={() => setIsMenuOpen(false)}>
                            <Settings size={16} /> Settings
                        </NavLink>
                        <button onClick={handleLogout} className="dropdown-item">
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const DesktopLoggedOutNav = () => {
        const publicLinks = filterNavItems('public-logged-out', null);
        return (
            <nav className="desktop-nav">
                {renderNavLinks(false, publicLinks)}
                <NavLink to="/start" className="button button-secondary">Login</NavLink>
                <NavLink to="/start" className="button button-primary">Sign Up</NavLink>
            </nav>
        );
    };

    return (
        <>
            <header className="main-header">
                <Link to={isLoggedIn && isDashboardRoute ? "/u/dashboard" : "/"} className="header-logo">
                    <img src="/logo.svg" alt="Artflow" style={{ height: '50px' }} />
                </Link>

                {/* Desktop Navigation Logic (visible by default, hide on mobile via CSS) */}
                <div className="desktop-only">
                    {isLoggedIn ? (
                        isDashboardRoute ? (
                            <DesktopLoggedInDashboardTopBar />
                        ) : (
                            <DesktopLoggedInPublicNav />
                        )
                    ) : (
                        <DesktopLoggedOutNav />
                    )}
                </div>

                {/* Mobile-Only Hamburger Menu Toggle (hidden on desktop via CSS) */}
                <button className="mobile-menu-toggle mobile-only" onClick={() => setIsMenuOpen(true)}>
                    <Menu size={28} />
                </button>
            </header>

            {isMenuOpen && (
                <>
                    <div className="offcanvas-menu-backdrop" onClick={() => setIsMenuOpen(false)}></div>
                    <div className={`offcanvas-menu ${isMenuOpen ? 'open' : ''} mobile-only`}> {/* Added mobile-only */}
                        <div className="offcanvas-header">
                            <Link to={isLoggedIn && isDashboardRoute ? "/u/dashboard" : "/"} className="header-logo" onClick={() => setIsMenuOpen(false)}>
                                <img src="/logo.svg" alt="Artflow" style={{ height: '50px' }}/>
                            </Link>
                            <button className="mobile-menu-toggle" onClick={() => setIsMenuOpen(false)}>
                                <X size={28} />
                            </button>
                        </div>
                        <div className="offcanvas-body">
                             {renderNavLinks(true, filterNavItems('mobile-menu', profile as AppProfile))}
                            {isLoggedIn ? (
                                <>
                                    <div className="nav-divider" />
                                    <button onClick={handleLogout} className="nav-item"><LogOut size={16} /> Logout</button>
                                </>
                            ) : (
                                <>
                                    <div className="nav-divider" />
                                    <NavLink to="/start" className="nav-item">Login</NavLink>
                                    <NavLink to="/start" className="nav-item">Sign Up</NavLink>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default Header;