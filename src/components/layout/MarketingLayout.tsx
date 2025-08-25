import React from 'react';
import { Outlet } from 'react-router-dom';
// CORRECTED: Path based on your file structure screenshot
import { useAuth } from '@/contexts/AuthProvider';
import Header from './Header';

const MarketingLayout = () => {
    const { session } = useAuth();

    return (
        <div>
            <Header session={session} />
            <main>
                <Outlet />
            </main>
        </div>
    );
};
export default MarketingLayout;