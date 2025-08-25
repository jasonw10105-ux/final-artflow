import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header'; // Assumes Header.tsx is in the same folder

const MarketingLayout = () => {
    // This component provides the shared layout for public-facing pages.
    // The Header component itself will use the useAuth hook to get the session state.
    // This keeps the layout component simple and focused on structure.

    return (
        <div>
            <Header />
            <main>
                <Outlet />
            </main>
            {/* You could add a shared <Footer /> component here as well */}
        </div>
    );
};

export default MarketingLayout;