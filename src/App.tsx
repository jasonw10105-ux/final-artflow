import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useParams, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthProvider';
import { Toaster } from 'react-hot-toast';

// Layouts
import MarketingLayout from './components/layout/MarketingLayout';
import DashboardLayout from './components/layout/DashboardLayout';

// Pages
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
import ArtworkListPage from './pages/dashboard/artist/ArtworkListPage';
import ArtistSettingsPage from './pages/dashboard/artist/ArtistSettingsPage';
import CollectorSettingsPage from './pages/dashboard/collector/CollectorSettingsPage';
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

// Artwork Form
import ArtworkForm from './components/dashboard/ArtworkForm';

// Import necessary types from app-specific.types.ts
import { AppProfile } from './types/app-specific.types';

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
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
};

// ---------- Require Profile Completion ----------
const RequireProfileCompleted = () => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  // Ensure profile is correctly typed and access `profile_completed` safely
  if (profile && !(profile as AppProfile).profile_completed) return <Navigate to="/complete-profile" replace />;
  return <Outlet />;
};

// ---------- Unified Dashboard Landing ----------
const DashboardPage = () => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  // Ensure profile is correctly typed
  const appProfile = profile as AppProfile | null;

  if (!appProfile) return <Navigate to="/login" replace />;
  if (!appProfile.profile_completed) return <Navigate to="/complete-profile" replace />;

  if (appProfile.role === 'artist' || appProfile.role === 'both') {
    return <ArtistDashboardPage />;
  }
  if (appProfile.role === 'collector') {
    return <CollectorDashboardPage />;
  }
  return <Navigate to="/login" replace />;
};

// ---------- Role Guards ----------
const ArtistRoute = ({ children }: { children: React.ReactElement }) => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  const appProfile = profile as AppProfile | null;

  if (!appProfile) return <Navigate to="/login" replace />;
  if (appProfile.role !== 'artist' && appProfile.role !== 'both') return <Navigate to="/u/dashboard" replace />;
  return children;
};

const CollectorRoute = ({ children }: { children: React.ReactElement }) => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  const appProfile = profile as AppProfile | null;

  if (!appProfile) return <Navigate to="/login" replace />;
  if (appProfile.role !== 'collector') return <Navigate to="/u/dashboard" replace />;
  return children;
};

// ---------- Unified Sales, Messages, Settings ----------
const SalesRoute = () => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  const appProfile = profile as AppProfile | null;

  if (!appProfile) return <Navigate to="/login" replace />;
  if (appProfile.role === 'artist' || appProfile.role === 'both') return <SalesPage />;
  if (appProfile.role === 'collector') return <CollectorSalesPage />;
  return <Navigate to="/login" replace />;
};

const MessagesRoute = () => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  const appProfile = profile as AppProfile | null;

  if (!appProfile) return <Navigate to="/login" replace />;
  if (appProfile.role === 'artist' || appProfile.role === 'both') return <MessagingCenterPage />;
  if (appProfile.role === 'collector') return <CollectorInquiriesPage />;
  return <Navigate to="/login" replace />;
};

const SettingsRoute = () => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  const appProfile = profile as AppProfile | null;

  if (!appProfile) return <Navigate to="/login" replace />;
  if (appProfile.role === 'artist' || appProfile.role === 'both') return <ArtistSettingsPage />;
  if (appProfile.role === 'collector') return <CollectorSettingsPage />;
  return <Navigate to="/login" replace />;
};

// ---------- ArtworkForm Wrapper ----------
const ArtworkFormWrapper: React.FC<{ isNew?: boolean }> = ({ isNew = false }) => {
  const { artworkId } = useParams<{ artworkId: string }>();
  const navigate = useNavigate();

  const effectiveArtworkId = isNew ? artworkId || 'new-artwork-temp-id' : artworkId;
  if (!effectiveArtworkId) return <p>No artwork selected.</p>;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl mb-6">{isNew ? 'Create Artwork' : 'Edit Artwork'}</h1>
      <ArtworkForm
        artworkId={effectiveArtworkId}
        onSaveSuccess={() => navigate('/u/artworks')}
      />
    </div>
  );
};

// ---------- App Routes ----------
const AppRoutes = () => (
  <Routes>
    {/* Public Routes */}
    <Route path="/" element={<WaitlistPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/update-password" element={<UpdatePasswordPage />} />

    {/* Marketing/Public */}
    <Route element={<MarketingLayout />}>
      <Route path="/home" element={<MarketingPage />} />
      <Route path="/artists" element={<BrowseArtistsPage />} />
      <Route path="/artworks" element={<BrowseArtworksPage />} />
      <Route path="/catalogues" element={<BrowseCataloguesPage />} />
      <Route path="/u/:artistSlug" element={<ArtistPortfolioPage />} />
      <Route path="/artwork/:artworkSlug" element={<IndividualArtworkPage />} />
      <Route path="/u/:artistSlug/catalogue/:catalogueSlug" element={<PublicCataloguePage />} />
    </Route>

    {/* Protected Dashboard */}
    <Route element={<ProtectedRoute />}>
      <Route path="/complete-profile" element={<CompleteProfilePage />} />
      <Route element={<RequireProfileCompleted />}>
        <Route element={<DashboardLayout />}>
          <Route path="/u/dashboard" element={<DashboardPage />} />

          {/* Artist Wizard / Editor now uses ArtworkForm */}
          <Route
            path="/u/artworks/wizard"
            element={
              <ArtistRoute>
                <ArtworkFormWrapper isNew />
              </ArtistRoute>
            }
          />
          <Route
            path="/u/artworks/edit/:artworkId"
            element={
              <ArtistRoute>
                <ArtworkFormWrapper />
              </ArtistRoute>
            }
          />
          <Route path="/u/catalogues/new" element={<ArtistRoute><CatalogueWizardPage /></ArtistRoute>} />
          <Route path="/u/catalogues/edit/:catalogueId" element={<ArtistRoute><CatalogueWizardPage /></ArtistRoute>} />

          <Route path="/u/artworks" element={<ArtistRoute><ArtworkListPage /></ArtistRoute>} />
          <Route path="/u/catalogues" element={<ArtistRoute><CatalogueListPage /></ArtistRoute>} />
          <Route path="/u/contacts" element={<ArtistRoute><ContactListPage /></ArtistRoute>} />

          {/* New Contact Route */}
          <Route path="/u/contacts/new" element={<ArtistRoute><ContactEditorPage /></ArtistRoute>} />
          {/* Existing Contact Edit Route */}
          <Route path="/u/contacts/edit/:contactId" element={<ArtistRoute><ContactEditorPage /></ArtistRoute>} />

          <Route path="/u/sales" element={<SalesRoute />} />
          <Route path="/u/messages" element={<MessagesRoute />} />
          <Route path="/u/insights" element={<ArtistRoute><ArtistInsightsPage /></ArtistRoute>} />
          <Route path="/u/settings" element={<SettingsRoute />} />

          {/* Collector Routes */}
          <Route path="/u/collection" element={<CollectorRoute><></></CollectorRoute>} /> {/* Placeholder for CollectorCollectionPage */}
          <Route path="/u/inquiries" element={<CollectorRoute><CollectorInquiriesPage /></CollectorRoute>} />
        </Route>
      </Route>
    </Route>

    {/* Catch All */}
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

export default App;