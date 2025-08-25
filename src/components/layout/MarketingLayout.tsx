import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthProvider';
// ... other layout components like Header, Footer

const MarketingLayout = () => {
    const { session } = useAuth(); // Correctly gets session from context

    return (
        <div>
            {/* Pass session to your header if needed */}
            {/* <Header session={session} /> */}
            <main>
                <Outlet />
            </main>
            {/* <Footer /> */}
        </div>
    );
};

export default MarketingLayout;