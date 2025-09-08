// src/components/layout/MobileBottomNavBar.tsx
import React, { useCallback, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider';
import {
    LayoutDashboard, Image, BookCopy, HandCoins, MessageSquare,
    Heart, Settings, Compass, DollarSign, Rocket, Map, CalendarDays, Users as ContactsIcon
} from 'lucide-react';
import '@/styles/app.css'; // Assuming shared styles
import { AppProfile } from '@/types/app.types'; // Import AppProfile type

// Define a subset of nav items for the bottom bar
interface BottomNavItem {
    to: string;
    label: string;
    icon: React.ReactNode;
    roles: ('artist' | 'collector' | 'both')[];
    exact?: boolean; // For exact matching (e.g., dashboard root)
    condition?: (profile: AppProfile | null) => boolean;
}

// Configuration for the mobile bottom nav bar (up to 5 items usually)
const bottomNavConfig: BottomNavItem[] = [
    { to: "/u/dashboard", label: "Dash", icon: <LayoutDashboard size={20} />, roles: ["artist", "both", "collector"], exact: true },
    
    // Artist-specific main content link
    { to: "/u/artworks", label: "Artworks", icon: <Image size={20} />, roles: ["artist", "both"] },
    
    // Collector-specific main content link
    { to: "/u/collection", label: "Collect", icon: <Heart size={20} />, roles: ["collector"] }, // Shorter label for mobile

    // Artist-specific messages link
    { to: "/u/messages", label: "Messages", icon: <MessageSquare size={20} />, roles: ["artist", "both"] },
    
    // Collector-specific inquiries link
    { to: "/u/inquiries", label: "Inquiries", icon: <MessageSquare size={20} />, roles: ["collector"] }, // Shorter label for mobile

    // Artist-specific sales link
    { to: "/u/sales", label: "Sales", icon: <HandCoins size={20} />, roles: ["artist", "both"] },
    
    // Collector-specific favorites link
    { to: "/u/favorites", label: "Favs", icon: <Heart size={20} />, roles: ["collector"] }, // Shorter label for mobile

    // Settings link for both (often lower priority on bottom bar, but can be included)
    { to: "/u/settings", label: "Settings", icon: <Settings size={20} />, roles: ["artist", "both", "collector"] },

    // Add other high-priority items if you have space or different needs
    // { to: "/u/calendar", label: "Calendar", icon: <CalendarDays size={20} />, roles: ["artist", "both"] },
    // { to: "/u/vault", label: "Vault", icon: <Rocket size={20} />, roles: ["collector"] },
    // { to: "/u/roadmap", label: "Roadmap", icon: <Map size={20} />, roles: ["collector"] },
    // { to: "/u/contacts", label: "Contacts", icon: <ContactsIcon size={20} />, roles: ["artist", "both"] },
];


const MobileBottomNavBar = () => {
    const { profile, isLoggedIn } = useAuth(); // Assuming isLoggedIn is available from useAuth
    const location = useLocation();

    // Determine if we are on a dashboard route (any route starting with /u)
    const isDashboardRoute = location.pathname.startsWith('/u');

    const filterBottomNavItems = useCallback((currentProfile: AppProfile | null): BottomNavItem[] => {
        if (!currentProfile) return [];

        const userRole = currentProfile.role;
        const relevantItems: BottomNavItem[] = [];
        const addedPaths = new Set<string>();

        const addUnique = (item: BottomNavItem | undefined) => {
            if (item && userRole && item.roles.includes(userRole) && !addedPaths.has(item.to)) {
                if (item.condition && !item.condition(currentProfile)) return; // Apply conditional check
                relevantItems.push(item);
                addedPaths.add(item.to);
            }
        };

        // Prioritized order for the bottom nav bar (adjust as needed)
        // 1. Dashboard
        addUnique(bottomNavConfig.find(item => item.to === "/u/dashboard"));

        // 2. Main content area (Artworks for artist, Collection for collector)
        if (userRole === 'artist' || userRole === 'both') {
            addUnique(bottomNavConfig.find(item => item.to === "/u/artworks"));
        } else if (userRole === 'collector') {
            addUnique(bottomNavConfig.find(item => item.to === "/u/collection"));
        }

        // 3. Messaging (Messages for artist, Inquiries for collector)
        if (userRole === 'artist' || userRole === 'both') {
            addUnique(bottomNavConfig.find(item => item.to === "/u/messages"));
        } else if (userRole === 'collector') {
            addUnique(bottomNavConfig.find(item => item.to === "/u/inquiries"));
        }

        // 4. Sales/Favorites
        if (userRole === 'artist' || userRole === 'both') {
            addUnique(bottomNavConfig.find(item => item.to === "/u/sales"));
        } else if (userRole === 'collector') {
            addUnique(bottomNavConfig.find(item => item.to === "/u/favorites"));
        }
        
        // 5. Settings (if space allows)
        addUnique(bottomNavConfig.find(item => item.to === "/u/settings"));

        // Ensure max 5 items, maintaining priority
        return relevantItems.slice(0, 5); 
    }, [profile]);


    const navItems = filterBottomNavItems(profile as AppProfile);

    // Render only if logged in, on a dashboard route, and there are items to show
    if (!isLoggedIn || !isDashboardRoute || navItems.length === 0) {
        return null;
    }

    return (
        // Added 'mobile-only' class: assumes you have CSS like @media (min-width: ...) { .mobile-only { display: none; } }
        <nav className="mobile-bottom-nav mobile-only">
            {navItems.map(item => (
                <NavLink 
                    key={item.to} 
                    to={item.to} 
                    className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
                    end={item.exact} // Use `end` for exact active match, especially for dashboard root
                >
                    {item.icon}
                    <span className="bottom-nav-label">{item.label}</span>
                </NavLink>
            ))}
        </nav>
    );
};

export default MobileBottomNavBar;