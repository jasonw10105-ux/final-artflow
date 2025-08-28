// --- START OF FILE MarketingLayout.tsx ---

import React from 'react';
import { Outlet } from 'react-router-dom'; // Import Outlet
import Header from './Header'; 

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

// REMOVE all artwork, catalogue, artist type definitions, API functions,
// ArtworkCard, CatalogueCard, ArtistCard, ContentCarousel, FeatureCard, TestimonialCard.
// These belong to the specific page that uses them, not the generic layout.

const MarketingLayout = () => {
    return (
        <>
            <Header /> {/* Render the Header component once here */}
            <main className="container"> {/* Use a main tag for semantic structure */}
                <Outlet /> {/* This is where child routes (like MarketingPage) will be rendered */}
            </main>
            <footer>
                <img src="/logo.svg" alt="Artflow" style={{ height: '400px' }}/>
                <p>© 2025 Artflow</p>
            </footer>
        </>
    );
};

export default MarketingLayout;