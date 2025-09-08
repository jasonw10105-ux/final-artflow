import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useParams, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthProvider';
import { Toaster } from 'react-hot-toast';

// Layouts
import MarketingLayout from './components/layout/MarketingLayout';
import DashboardLayout from './components/layout/DashboardLayout';

// Pages (Core Application Pages)
import WaitlistPage from './pages/WaitlistPage';
import StartPage from './pages/StartPage'; // NEW: Use StartPage
// Removed: RegisterPage, LoginPage
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import UpdatePasswordPage from './pages/UpdatePasswordPage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Pages (Dashboard - Artist)
import ArtistDashboardPage from './pages/dashboard/artist/ArtistDashboardPage';
import MessagingCenterPage from './pages/dashboard/artist/MessagingCenterPage';
import ArtworkListPage from './pages/dashboard/artist/ArtworkListPage';
import ArtistSettingsPage from './pages/dashboard/artist/ArtistSettingsPage';
import ArtistPortfolioPage from './pages/public/ArtistPortfolioPage'; // Public page, but artist-specific
import CatalogueWizardPage from './pages/dashboard/artist/CatalogueWizardPage';
import CatalogueListPage from './pages/dashboard/artist/CatalogueListPage';
import ArtistInsightsPage from './pages/dashboard/artist/ArtistInsightsPage';
import ReportsPage from './pages/dashboard/artist/ArtistReportsPage';
import ArtistCalendarPage from './pages/dashboard/artist/ArtistCalendarPage';
import ContactListPage from './pages/dashboard/artist/ContactListPage';
import ContactEditorPage from './pages/dashboard/artist/ContactEditorPage';
import SalesPage from './pages/dashboard/artist/SalesPage';

// Pages (Dashboard - Collector)
import CollectorDashboardPage from './pages/dashboard/collector/CollectorDashboardPage';
import CollectorInquiriesPage from './pages/dashboard/collector/CollectorInquiriesPage';
import CollectorSettingsPage from './pages/dashboard/collector/CollectorSettingsPage';
import CollectorFavoritesPage from './pages/dashboard/collector/CollectorFavoritesPage';
import CollectorSalesPage from './pages/dashboard/collector/CollectorSalesPage';
import CollectorExplorePage from './pages/dashboard/collector/CollectorExplorePage'; // New page
import MyCollectionPage from './pages/dashboard/collector/CollectorCollectionPage';
import MyVaultPage from './pages/dashboard/collector/CollectorVaultPage';
import CollectorRoadmapPage from './pages/dashboard/collector/CollectionRoadmapPage';


// Pages (Public)
import IndividualArtworkPage from './pages/public/IndividualArtworkPage';
import PublicCataloguePage from './pages/public/PublicCataloguePage';
import BrowseArtistsPage from './pages/public/BrowseArtistsPage';
import BrowseArtworksPage from './pages/public/BrowseArtworksPage';
import BrowseCataloguesPage from './pages/public/BrowseCataloguesPage';
import PublicCommunityCurations from './pages/public/PublicCommunityCurations';


// Components used directly in routes (e.g., for forms without dedicated layouts)
import ArtworkForm from './components/dashboard/ArtworkForm';

import { AppProfile } from './types/app.types'; 

// ---------- Loading Component ----------
const AuthLoading = () => (
  <div className="loading-container">
    <p>Loading Application...</p>
  </div>
);

// ---------- Protected Route ----------
const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/start" replace />; // UPDATED: Navigate to /start
  return <Outlet />;
};

// ---------- Require Profile Completion ----------
const RequireProfileCompleted = () => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  const appProfile = profile as AppProfile | null;

  if (appProfile && !appProfile.profile_completed) return <Navigate to="/complete-profile" replace />;
  return <Outlet />;
};

// ---------- Unified Dashboard Landing ----------
const DashboardPage = () => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  const appProfile = profile as AppProfile | null;

  if (!appProfile) return <Navigate to="/start" replace />; // UPDATED: Navigate to /start
  if (!appProfile.profile_completed) return <Navigate to="/complete-profile" replace />;

  if (appProfile.role === 'artist' || appProfile.role === 'both') {
    return <ArtistDashboardPage />;
  }
  if (appProfile.role === 'collector') {
    return <CollectorDashboardPage />;
  }
  return <Navigate to="/start" replace />; // UPDATED: Navigate to /start
};

// ---------- Role Guards ----------
const ArtistRoute = () => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  const appProfile = profile as AppProfile | null;

  if (!appProfile) return <Navigate to="/start" replace />; // UPDATED: Navigate to /start
  if (appProfile.role !== 'artist' && appProfile.role !== 'both') return <Navigate to="/u/dashboard" replace />;
  return <Outlet />;
};

const CollectorRoute = () => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  const appProfile = profile as AppProfile | null;

  if (!appProfile) return <Navigate to="/start" replace />; // UPDATED: Navigate to /start
  if (appProfile.role !== 'collector' && appProfile.role !== 'both') return <Navigate to="/u/dashboard" replace />;
  return <Outlet />;
};

// ---------- Unified Sales, Messages, Settings ----------
const SalesRoute = () => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  const appProfile = profile as AppProfile | null;

  if (!appProfile) return <Navigate to="/start" replace />; // UPDATED: Navigate to /start
  if (appProfile.role === 'artist' || appProfile.role === 'both') return <SalesPage />;
  if (appProfile.role === 'collector') return <CollectorSalesPage />;
  return <Navigate to="/start" replace />; // UPDATED: Navigate to /start
};

const MessagesRoute = () => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  const appProfile = profile as AppProfile | null;

  if (!appProfile) return <Navigate to="/start" replace />; // UPDATED: Navigate to /start
  if (appProfile.role === 'artist' || appProfile.role === 'both') return <MessagingCenterPage />;
  if (appProfile.role === 'collector') return <CollectorInquiriesPage />;
  return <Navigate to="/start" replace />; // UPDATED: Navigate to /start
};

const SettingsRoute = () => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  const appProfile = profile as AppProfile | null;

  if (!appProfile) return <Navigate to="/start" replace />; // UPDATED: Navigate to /start
  if (appProfile.role === 'artist' || appProfile.role === 'both') return <ArtistSettingsPage />;
  if (appProfile.role === 'collector') return <CollectorSettingsPage />;
  return <Navigate to="/start" replace />; // UPDATED: Navigate to /start
};

// ---------- ArtworkForm Content (NO LAYOUT HERE) ----------
const ArtworkFormContent: React.FC<{ isNew?: boolean }> = ({ isNew = false }) => {
  const { artworkId } = useParams<{ artworkId: string }>();
  const navigate = useNavigate();

  if (!isNew && !artworkId) return <p>No artwork selected for editing.</p>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl mb-6">{isNew ? 'Create Artwork' : 'Edit Artwork'}</h1>
      <ArtworkForm
        artworkId={artworkId}
        onSaveSuccess={() => navigate('/u/artworks')}
      />
    </div>
  );
};

// ---------- CatalogueWizard Content (NO LAYOUT HERE) ----------
const CatalogueWizardContent: React.FC = () => {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <CatalogueWizardPage />
    </div>
  );
};

// ---------- ContactEditor Content (NO LAYOUT HERE) ----------
const ContactEditorContent: React.FC = () => {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <ContactEditorPage />
    </div>
  );
};


// ---------- App Routes ----------
const AppRoutes = () => (
  <Routes>
    {/* Public Auth Routes - No Layout */}
    <Route path="/" element={<WaitlistPage />} />
    <Route path="/start" element={<StartPage />} /> {/* NEW: Consolidated login/register route */}
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/update-password" element={<UpdatePasswordPage />} />
    <Route path="/complete-profile" element={<CompleteProfilePage />} />
    
    {/* Marketing/Public Routes - Use MarketingLayout */}
    <Route element={<MarketingLayout />}>
      <Route path="/home" element={<MarketingPage />} />
      <Route path="/artists" element={<BrowseArtistsPage />} />
      <Route path="/artworks" element={<BrowseArtworksPage />} />
      <Route path="/catalogues" element={<BrowseCataloguesPage />} />
      <Route path="/u/:artistSlug" element={<ArtistPortfolioPage />} />
      <Route path="/artwork/:artworkSlug" element={<IndividualArtworkPage />} />
      <Route path="/u/:artistSlug/catalogue/:catalogueSlug" element={<PublicCataloguePage />} />
      <Route path="/explore" element={<CollectorExplorePage />} />
      <Route path="/explore/community-curations" element={<PublicCommunityCurations />} />
    </Route>

    {/* Protected Dashboard Routes (requires login and completed profile) */}
    <Route element={<ProtectedRoute />}>
      <Route element={<RequireProfileCompleted />}>
        <>
          <Route path="/u" element={<DashboardLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Artist Specific Routes (within DashboardLayout) */}
            <Route element={<ArtistRoute />}>
              <Route path="artworks" element={<ArtworkListPage />} />
              <Route path="catalogues" element={<CatalogueListPage />} />
              <Route path="contacts" element={<ContactListPage />} />
              <Route path="insights" element={<ArtistInsightsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="calendar" element={<ArtistCalendarPage />} />
            </Route>

            {/* Collector Specific Routes (within DashboardLayout) */}
            <Route element={<CollectorRoute />}>
              <Route path="collection" element={<MyCollectionPage />} />
              <Route path="vault" element={<MyVaultPage />} />
              <Route path="favorites" element={<CollectorFavoritesPage />} />
              <Route path="roadmap" element={<CollectorRoadmapPage />} />
            </Route>

            {/* Shared Routes (role-based content handled internally, within DashboardLayout) */}
            <Route path="sales" element={<SalesRoute />} />
            <Route path="messages" element={<MessagesRoute />} />
            <Route path="settings" element={<SettingsRoute />} />
          </Route>

          {/* Routes that are protected but render their own "no-nav" layout (full width) */}
          <Route path="/u/artworks/new" element={<ArtistRoute><ArtworkFormContent isNew /></ArtistRoute>} />
          <Route path="/u/artworks/edit/:artworkId" element={<ArtistRoute><ArtworkFormContent /></ArtistRoute>} />
          <Route path="/u/catalogues/new" element={<ArtistRoute><CatalogueWizardContent /></ArtistRoute>} />
          <Route path="/u/catalogues/edit/:catalogueId" element={<ArtistRoute><CatalogueWizardContent /></ArtistRoute>} />
          <Route path="/u/contacts/new" element={<ArtistRoute><ContactEditorContent /></ArtistRoute>} />
          <Route path="/u/contacts/edit/:contactId" element={<ArtistRoute><ContactEditorContent /></ArtistRoute>} />
        </>
      </Route>
    </Route>

    {/* Catch All - 404 Page */}
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

const App = () => (
  <Router>
    <AuthProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{ style: { background: 'var(--color-neutral-700)', color: 'var(--primary-foreground)', borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)' }, success: { duration: 3000, style: { background: 'var(--color-green-success)', color: 'var(--primary-foreground)' } }, error: { duration: 5000, style: { background: 'var(--color-red-danger)', color: 'var(--primary-foreground)' } }, }}
      />
      <AppRoutes />
    </AuthProvider>
  </Router>
);