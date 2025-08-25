import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header'; // Assumes Header.tsx is in the same folder
// No need to import useAuth here anymore

const MarketingLayout = () => {
    // This component is now a pure structural wrapper. It provides the shared layout
    // for public-facing pages. The Header component itself will handle its
    // own logic for displaying logged-in vs. logged-out states.

    return (
        <div>
            {/* The Header component no longer receives any props */}
            <Header />
            <main>
                {/* Child routes (like /home, /artists) will be rendered here */}
                <Outlet />
            </main>
            {/* You could add a shared <Footer /> component here as well */}
        </div>
    );
};

export default MarketingLayout;