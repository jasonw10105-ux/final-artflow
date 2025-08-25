import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthProvider'; // CORRECTED: Path changed from ../ to @/
import Header from './Header'; // Assuming Header is in the same folder

const MarketingLayout = () => {
    // This component's structure is simple: it provides the shared layout
    // for public-facing pages. The useAuth hook is used here to pass
    // the session state to the Header for conditional rendering of nav links.
    const { session } in useAuth();

    return (
        <div>
            {/* The Header component will decide whether to show "Login" or "Dashboard" */}
            <Header session={session} />
            <main>
                {/* Child routes (like /home, /artists) will be rendered here */}
                <Outlet />
            </main>
            {/* You could add a shared <Footer /> component here as well */}
        </div>
    );
};

export default MarketingLayout;