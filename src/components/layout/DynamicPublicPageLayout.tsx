// src/components/layout/DynamicPublicPageLayout.tsx

import React from 'react';
import MarketingLayout from './MarketingLayout';
import { useAuth } from '../../contexts/AuthProvider';

const DynamicPublicPageLayout = () => {
    const { loading } = useAuth();

    if (loading) {
        return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>Loading...</div>;
    }

    // This correctly uses the MarketingLayout, which is now auth-aware via its Header.
    return <MarketingLayout />;
};

export default DynamicPublicPageLayout;