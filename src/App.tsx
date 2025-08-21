import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthProvider';

// --- Layout Imports ---
import MarketingLayout from './components/layout/MarketingLayout';
import DashboardLayout from './components/layout/DashboardLayout';

// --- Page Imports ---
import WaitlistPage from './pages/WaitlistPage'; // <-- IMPORT FOR HOMEPAGE
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
import ContactDetailPage from './pages/dashboard/artist/ContactDetailPage';
import BrowseArtistsPage from './pages/public/BrowseArtistsPage';
import BrowseArtworksPage from './pages/public/BrowseArtworksPage';
import BrowseCataloguesPage from './pages/public/BrowseCataloguesPage';

const DashboardRedirector = () => {
    const { profile, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (profile && !profile.profile_completed) return <Navigate to="/complete-profile" replace />;
    if (profile?.role === 'artist' || profile?.role === 'both') return <Navigate to="/artist/dashboard" replace />;
    if (profile?.role === 'collector') return <Navigate to="/collector/dashboard" replace />;
    return <Navigate to="/complete-profile" replace />;
};

const ProtectedRoute = () => {
    const { user, profile, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    if (!profile?.profile_completed) return <Navigate to="/complete-profile" replace />;
    return <Outlet />;
};

function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* --- 1. WAITLIST & AUTH ROUTES (Standalone, No Layout) --- */}
        <Route path="/" element={<WaitlistPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/update-password" element={<UpdatePasswordPage />} />
        <Route path="/complete-profile" element={<CompleteProfilePage />} />
        
        {/* --- 2. Public Routes (Wrapped in Marketing Layout) --- */}
        <Route element={<MarketingLayout />}>
            <Route path="/home" element={<MarketingPage />} />
            <Route path="/artists" element={<BrowseArtistsPage />} />
            <Route path="/artworks" element={<BrowseArtworksPage />} />
            <Route path="/catalogues" element={<BrowseCataloguesPage />} />
            <Route path="/:profileSlug" element={<ArtistPortfolioPage />} />
            <Route path="/artwork/:artistSlug/:artworkSlug" element={<IndividualArtworkPage />} />
            <Route path="/catalogue/:artistSlug/:catalogueSlug" element={<PublicCataloguePage />} />
        </Route>
        
        {/* --- 3. Protected Dashboard Redirect --- */}
        <Route path="/dashboard" element={<DashboardRedirector />} />

        {/* --- 4. Fully Protected Routes (Require login AND completed profile) --- */}
        <Route element={<ProtectedRoute />}>
            <Route path="/artist/artworks/wizard" element={<ArtworkWizardPage />} />
            <Route element={<DashboardLayout />}>
                <Route path="/artist/dashboard" element={<ArtistDashboardPage />} />
                <Route path="/artist/artworks" element={<ArtworkListPage />} />
                <Route path="/artist/artworks/new" element={<ArtworkEditorPage />} />
                <Route path="/artist/artworks/edit/:artworkId" element={<ArtworkEditorPage />} />
                <Route path="/artist/catalogues" element={<CatalogueListPage />} />
                <Route path="/artist/catalogues/new" element={<CatalogueWizardPage />} />
                <Route path="/artist/catalogues/edit/:catalogueId" element={<CatalogueWizardPage />} />
                <Route path="/artist/contacts" element={<ContactListPage />} />
                <Route path="/artist/contacts/new" element={<ContactEditorPage />} />
                <Route path="/artist/contacts/edit/:contactId" element={<ContactEditorPage />} />
                <Route path="/artist/contacts/:contactId" element={<ContactDetailPage />} />
                <Route path="/artist/messages" element={<MessagingCenterPage />} />
                <Route path="/artist/insights" element={<ArtistInsightsPage />} />
                <Route path="/artist/settings" element={<ArtistSettingsPage />} />
                <Route path="/collector/dashboard" element={<CollectorDashboardPage />} />
                <Route path="/collector/inquiries" element={<CollectorInquiriesPage />} />
            </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  const { loading } = useAuth();
  if (loading) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>Loading Application...</div>;
  }
  return <AppRoutes />;
}