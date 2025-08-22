// src/components/layout/DynamicPublicPageLayout.tsx

import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthProvider';
import DashboardLayout from './DashboardLayout';
import MarketingLayout from './MarketingLayout';

/**
 * A layout component that dynamically selects the appropriate navigation layout.
 * - If the authenticated user is viewing their own public content (artwork, catalogue),
 *   it renders the DashboardLayout.
 * - Otherwise, it renders the standard MarketingLayout for public viewing.
 */
const DynamicPublicPageLayout = () => {
    const { profile, loading } = useAuth();
    const { artistSlug } = useParams<{ artistSlug?: string }>();

    // Display a loading state while authentication status is being determined.
    if (loading) {
        return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>Loading...</div>;
    }

    // Determine if the currently logged-in user is the owner of the page being viewed.
    const isOwner = profile && artistSlug && profile.slug === artistSlug;

    // Render the appropriate layout. The layout's <Outlet /> will render the actual page component.
    return isOwner ? <DashboardLayout /> : <MarketingLayout />;
};

export default DynamicPublicPageLayout;