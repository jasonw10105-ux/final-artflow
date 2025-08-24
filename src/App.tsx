// src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthProvider';

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
import ArtistSettingsPage from './pages/dashboard/artist/ArtistSettingsPage'; // FIX: Correctly imported as default
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
    <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
        Loading Application...
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

const ProtectedRoute = () => {
    const { user, profile, loading } = useAuth();
    if (loading) return <AuthLoading />;
    if (!user) return <Navigate to="/login" replace />;
    if (!profile?.profile_completed) return <Navigate to="/complete-profile" replace />;
    return <Outlet />; // FIX: This is a valid return, the error was a symptom of the App component structure
};

const AppRoutes = () => {
  return (
      <Routes>
        {/* All your Route definitions go here, they are correct */}
        {/* ... */}
        <Route path="/" element={<WaitlistPage />} />
        <Route path="/login" element={<LoginPage />} />
        {/* ... etc. */}
      </Routes>
  );
}

// FIX: Corrected main App component structure
const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;