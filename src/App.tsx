import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthProvider';
import { Toaster } from 'react-hot-toast';

// --- Layout Imports ---
import MarketingLayout from './components/layout/MarketingLayout';
import DashboardLayout from './components/layout/DashboardLayout';

// --- Page Imports (remain the same) ---
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
        <p>Loading Application...</p>
    </div>
);

const DashboardRedirector = () => {
    const { profile, loading } = useAuth();
    if (loading) return <AuthLoading />;
    if (profile && !profile.profile_completed) return <Navigate to="/complete-profile" replace />;
    if (profile?.role === 'artist' || profile?.role === 'both') return <Navigate to="/artist/dashboard" replace />;
    if (profile?.role === 'collector') return <Navigate to="/collector/dashboard" replace />;
    return <Navigate to="/login" replace />;
};

// --- FIX: SIMPLIFIED PROTECTED ROUTE ---
// This component now only checks for a logged-in user.
const ProtectedRoute = () => {
    const { user, loading } = useAuth();
    if (loading) return <AuthLoading />;
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return <Outlet />;
};

// --- FIX: NEW COMPONENT FOR PROFILE COMPLETION ---
// This component handles redirecting users with incomplete profiles.
const RequireProfileCompleted = () => {
    const { profile, loading } = useAuth();
    if (loading) return <AuthLoading />;
    if (profile && !profile.profile_completed) {
        return <Navigate to="/complete-profile" replace />;
    }
    return <Outlet />;
};

const AppRoutes = () => {
  return (
      <Routes>
        {/* --- Public Routes (No changes here) --- */}
        <Route path="/" element={<WaitlistPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/update-password" element={<UpdatePasswordPage />} />
        
        <Route element={<MarketingLayout />}>
            <Route path="/home" element={<MarketingPage />} />
            <Route path="/artists" element={<BrowseArtistsPage />} />
            <Route path="/artworks" element={<BrowseArtworksPage />} />
            <Route path="/catalogues" element={<BrowseCataloguesPage />} />
            <Route path="/u/:profileSlug" element={<ArtistPortfolioPage />} />
            <Route path="/artwork/:artworkSlug" element={<IndividualArtworkPage />} />
            <Route path="/:artistSlug/catalogue/:catalogueSlug" element={<PublicCataloguePage />} />
        </Route>

        {/* --- FIX: RESTRUCTURED PROTECTED ROUTES --- */}
        <Route element={<ProtectedRoute />}>
            {/* This page only requires a user to be logged in */}
            <Route path="/complete-profile" element={<CompleteProfilePage />} />
            
            {/* All routes inside here require a COMPLETED profile */}
            <Route element={<RequireProfileCompleted />}>
                <Route path="/dashboard" element={<DashboardRedirector />} />
                
                {/* Standalone Wizard/Editor Routes */}
                <Route path="/artist/artworks/wizard" element={<ArtworkWizardPage />} />
                <Route path="/artist/catalogues/new" element={<CatalogueWizardPage />} />
                <Route path="/artist/catalogues/edit/:catalogueId" element={<CatalogueWizardPage />} />
                <Route path="/artist/artworks/edit/:artworkId" element={<ArtworkEditorPage />} />
                
                {/* Main Dashboard Routes with Layout */}
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
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
  );
}

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-neutral-700)',
              color: 'var(--primary-foreground)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-md)',
            },
            success: { duration: 3000, style: { background: 'var(--color-green-success)', color: 'var(--primary-foreground)' } },
            error: { duration: 5000, style: { background: 'var(--color-red-danger)', color: 'var(--primary-foreground)' } },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;