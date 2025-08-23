// src/components/layout/DynamicPublicPageLayout.tsx

import React from 'react';
import MarketingLayout from './MarketingLayout';
import { useAuth } from '../../contexts/AuthProvider';

/**
 * A layout component that dynamically selects the appropriate navigation layout.
 * - If the authenticated user is viewing their own public content (artwork, catalogue),
 *   it renders the DashboardLayout.
 * - Otherwise, it renders the standard MarketingLayout for public viewing.
 */
const DynamicPublicPageLayout = () => {
    const { loading } = useAuth();

    // Display a loading state while authentication status is being determined.
    if (loading) {
        return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>Loading...</div>;
    }

    // This layout now consistently uses the MarketingLayout for all public pages.
    // The MarketingLayout itself is now auth-aware and will render the correct navigation.
    return <MarketingLayout />;
};

export default DynamicPublicPageLayout;