// src/components/layout/MarketingLayout.tsx

import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header'; // This import will now succeed

const MarketingLayout = () => {
    return (
        <div>
            <Header />
            <main style={{ padding: '2rem' }}>
                <Outlet />
            </main>
            {/* You can add a consistent footer here if you wish */}
        </div>
    );
};

export default MarketingLayout;