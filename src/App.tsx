import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthProvider';
import { Toaster } from 'react-hot-toast'; // Import the Toaster component

// --- Layout Imports ---
import MarketingLayout from './components/layout/MarketingLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import DynamicPublicPageLayout from './components/layout/DynamicPublicPageLayout';

// --- Page Imports ---
import WaitlistPage from './pages/WaitlistPage';
import MarketingPage from './pages/MarketingPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import UpdatePasswordPage from './pages/UpdatePasswordPage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import ArtistDashboardPage from './pages/dashboard/artist/ArtistDashboardPage';
import CollectorDashboardPage from './pages/dashboard/collector/CollectorDashboardPage';
import IndividualArtworkPage from './pages/public/IndividualArtworkPage';
import NotFoundPage from './pages/NotFoundPage';
import MessagingCenterPage from './pages/dashboard/artist/MessagingCenterPage';
import CollectorInquiriesPage from './pages/dashboard/collector/CollectorInquiriesPage';
import ArtworkEditorPage from './pages/dashboard/artist/ArtworkEditorPage';
import ArtworkListPage from './pages/dashboard/artist/ArtworkListPage';
import ArtistSettingsPage from './pages/dashboard/artist/ArtistSettingsPage';
import ArtistPortfolioPage from './pages/public/ArtistPortfolioPage';
import CatalogueWizardPage from './pages/dashboard/artist/CatalogueWizardPage';
import CatalogueListPage from './pages/dashboard/artist/CatalogueListPage';
import PublicCataloguePage from './pages/public/PublicCataloguePage';
import ArtistInsightsPage from './pages/dashboard/artist/ArtistInsightsPage';
import ArtworkWizardPage from './pages/dashboard/artist/ArtworkWizardPage';
import ContactListPage from './pages/dashboard/artist/ContactListPage';
import ContactEditorPage from './pages/dashboard/artist/ContactEditorPage';
import BrowseArtistsPage from './pages/public/BrowseArtistsPage';
import BrowseArtworksPage from './pages/public/BrowseArtworksPage';
import BrowseCataloguesPage from './pages/public/BrowseCataloguesPage';
import SalesPage from './pages/dashboard/artist/SalesPage';
import CollectorSalesPage from './pages/dashboard/collector/CollectorSalesPage';
import CollectorSettingsPage from './pages/dashboard/collector/CollectorSettingsPage';

const AuthLoading = () => (
    <div className="loading-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        {/* Replace with a proper spinner component if you have one */}
        <p>Loading Application...</p>
    </div>
);

const DashboardRedirector = () => {
    const { profile, loading } = useAuth();
    if (loading) return <AuthLoading />;
    if (profile && !profile.profile_completed) return <Navigate to="/complete-profile" replace />;
    if (profile?.role === 'artist' || profile?.role === 'both') return <Navigate to="/artist/dashboard" replace />;
    if (profile?.role === 'collector') return <Navigate to="/collector/dashboard" replace />;
    return <Navigate to="/login" replace />; // Fallback if no user or role after loading
};

const ProtectedRoute = () => {
    const { user, profile, loading } = useAuth();
    if (loading) return <AuthLoading />;

    // 1. If no user, redirect to login
    if (!user) return <Navigate to="/login" replace />;

    // --- REFINED LOGIC ---
    // 2. If user has an incomplete profile, they MUST complete it.
    // The only protected page they can visit is /complete-profile itself.
    if (!profile?.profile_completed) {
        // If they are not already on the complete profile page, force them there.
        if (window.location.pathname !== '/complete-profile') {
            return <Navigate to="/complete-profile" replace />;
        }
    }
    
    // 3. If the user is authenticated and has a complete profile, render the requested child route.
    return <Outlet />;
};

const AppRoutes = () => {
  return (
      <Routes>
        {/* --- Public Standalone Routes --- */}
        <Route path="/" element={<WaitlistPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/update-password" element={<UpdatePasswordPage />} />
        
        {/* --- Public Routes with Layouts --- */}
        <Route element={<MarketingLayout />}>
            <Route path="/home" element={<MarketingPage />} />
            <Route path="/artists" element={<BrowseArtistsPage />} />
            <Route path="/artworks" element={<BrowseArtworksPage />} />
            <Route path="/catalogues" element={<BrowseCataloguesPage />} />
            <Route path="/:profileSlug" element={<ArtistPortfolioPage />} />
        </Route>
        <Route element={<DynamicPublicPageLayout />}>
            <Route path="/:artistSlug/artwork/:artworkSlug" element={<IndividualArtworkPage />} />
            <Route path="/:artistSlug/catalogue/:catalogueSlug" element={<PublicCataloguePage />} />
        </Route>

        {/* --- Protected Routes --- */}
        <Route element={<ProtectedRoute />}>
            {/* The /complete-profile page is now protected, ensuring only logged-in users can access it */}
            <Route path="/complete-profile" element={<CompleteProfilePage />} />
            <Route path="/dashboard" element={<DashboardRedirector />} />
            
            {/* Standalone Wizard/Editor Routes */}
            <Route path="/artist/artworks/wizard" element={<ArtworkWizardPage />} />
            <Route path="/artist/catalogues/new" element={<CatalogueWizardPage />} />
            <Route path="/artist/catalogues/edit/:catalogueId" element={<CatalogueWizardPage />} />
            <Route path="/artist/artworks/edit/:artworkId" element={<ArtworkEditorPage />} />
            
            {/* Routes with Dashboard Layout */}
            <Route element={<DashboardLayout />}>
                <Route path="/artist/dashboard" element={<ArtistDashboardPage />} />
                <Route path="/artist/artworks" element={<ArtworkListPage />} />
                <Route path="/artist/catalogues" element={<CatalogueListPage />} />
                <Route path="/artist/contacts" element={<ContactListPage />} />
                <Route path="/artist/contacts/edit/:contactId" element={<ContactEditorPage />} />
                <Route path="/artist/messages" element={<MessagingCenterPage />} />
                <Route path="/artist/sales" element={<SalesPage />} />
                <Route path="/artist/insights" element={<ArtistInsightsPage />} />
                <Route path="/artist/settings" element={<ArtistSettingsPage />} />
                <Route path="/collector/dashboard" element={<CollectorDashboardPage />} />
                <Route path="/collector/inquiries" element={<CollectorInquiriesPage />} />
                <Route path="/collector/collection" element={<CollectorSalesPage />} />
                <Route path="/collector/settings" element={<CollectorSettingsPage />} />
            </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
  );
}

const App = () => {
  return (
    <Router>
      <AuthProvider>
        {/* The Toaster component provides notifications for the entire app */}
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-neutral-700)',
              color: 'var(--primary-foreground)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-md)',
            },
            success: {
              duration: 3000,
              style: { background: 'var(--color-green-success)', color: 'var(--primary-foreground)' },
            },
            error: {
              duration: 5000,
              style: { background: 'var(--color-red-danger)', color: 'var(--primary-foreground)' },
            },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;