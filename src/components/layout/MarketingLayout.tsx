import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';

const MarketingLayout = () => {
    // This component is a simple structural wrapper. The Header component
    // is self-sufficient and will fetch its own authentication state.
    return (
        <div>
            <Header />
            <main>
                <Outlet />
            </main>
            {/* You can add a shared <Footer /> component here */}
        </div>
    );
};

export default MarketingLayout;