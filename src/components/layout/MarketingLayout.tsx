// src/components/layout/MarketingLayout.tsx

import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header'; // Import the new intelligent header

const MarketingLayout = () => {
    return (
        <div>
            <Header />
            <main>
                <Outlet />
            </main>
            {/* You can add a consistent footer here if you wish */}
        </div>
    );
};

export default MarketingLayout;