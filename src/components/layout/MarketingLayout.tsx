import React from 'react';
import { Outlet } from 'react-router-dom'; // Keep Outlet
import Header from './Header';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const MarketingLayout = () => {
    return (
        <>
            <Header /> {/* Navigation header */}
            <main className="container">
                <Outlet /> {/* Nested routes will render here */}
            </main>
            <footer>
                <img src="/logo.svg" alt="Artflow" style={{ height: '400px' }} />
                <p>© 2025 Artflow</p>
            </footer>
        </>
    );
};

export default MarketingLayout;
