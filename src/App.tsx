import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
import ArtworkEditorPage from './pages/dashboard/artist/ArtworkEditorPage';
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

// Loading UI while auth/profile loads
const AuthLoading = () => (
  <div className="loading-container">
    <p>Loading Application...</p>
  </div>
);

// Protected Route wrapper - redirects to login if not authenticated
const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
};

// Require profile completion before proceeding
const RequireProfileCompleted = () => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (profile && !profile.profile_completed) return <Navigate to="/complete-profile" replace />;
  return <Outlet />;
};

// Unified dashboard component that renders based on role
const DashboardPage = () => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!profile) return <Navigate to="/login" replace />;
  if (!profile.profile_completed) return <Navigate to="/complete-profile" replace />;

  if (profile.role === 'artist' || profile.role === 'both') {
    return <ArtistDashboardPage />;
  }
  if (profile.role === 'collector') {
    return <CollectorDashboardPage />;
  }
  return <Navigate to="/login" replace />;
};

// Role guard HOC for artist-only routes
const ArtistRoute = ({ children }: { children: React.ReactElement }) => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role !== 'artist' && profile.role !== 'both') return <Navigate to="/dashboard" replace />;
  return children;
};

// Role guard HOC for collector-only routes
const CollectorRoute = ({ children }: { children: React.ReactElement }) => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role !== 'collector') return <Navigate to="/dashboard" replace />;
  return children;
};

// Unified Sales Route
const SalesRoute = () => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role === 'artist' || profile.role === 'both') return <SalesPage />;
  if (profile.role === 'collector') return <CollectorSalesPage />;
  return <Navigate to="/login" replace />;
};

// Unified Messages Route
const MessagesRoute = () => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role === 'artist' || profile.role === 'both') return <MessagingCenterPage />;
  if (profile.role === 'collector') return <CollectorInquiriesPage />;
  return <Navigate to="/login" replace />;
};

// Unified Settings Route
const SettingsRoute = () => {
  const { profile, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role === 'artist' || profile.role === 'both') return <ArtistSettingsPage />;
  if (profile.role === 'collector') return <CollectorSettingsPage />;
  return <Navigate to="/login" replace />;
};

const AppRoutes = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/" element={<WaitlistPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/update-password" element={<UpdatePasswordPage />} />

    {/* Marketing routes */}
    <Route element={<MarketingLayout />}>
      <Route index path="/home" element={<MarketingPage />} />
      <Route path="/artists" element={<BrowseArtistsPage />} />
      <Route path="/artworks" element={<BrowseArtworksPage />} />
      <Route path="/catalogues" element={<BrowseCataloguesPage />} />
      <Route path="/u/:profileSlug" element={<ArtistPortfolioPage />} />
      <Route path="/artwork/:artworkSlug" element={<IndividualArtworkPage />} />
      <Route path="/:artistSlug/catalogue/:catalogueSlug" element={<PublicCataloguePage />} />
    </Route>

    {/* Protected routes */}
    <Route element={<ProtectedRoute />}>
      <Route path="/complete-profile" element={<CompleteProfilePage />} />

      <Route element={<RequireProfileCompleted />}>
        {/* Unified dashboard */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Wizard/editor pages */}
        <Route
          path="/artworks/wizard"
          element={
            <ArtistRoute>
              <ArtworkWizardPage />
            </ArtistRoute>
          }
        />
        <Route
          path="/catalogues/new"
          element={
            <ArtistRoute>
              <CatalogueWizardPage />
            </ArtistRoute>
          }
        />
        <Route
          path="/catalogues/edit/:catalogueId"
          element={
            <ArtistRoute>
              <CatalogueWizardPage />
            </ArtistRoute>
          }
        />
        <Route
          path="/artworks/edit/:artworkId"
          element={
            <ArtistRoute>
              <ArtworkEditorPage />
            </ArtistRoute>
          }
        />
        <Route
          path="/contacts/edit/:contactId"
          element={
            <ArtistRoute>
              <ContactEditorPage />
            </ArtistRoute>
          }
        />

        {/* Dashboard layout */}
        <Route element={<DashboardLayout />}>
          {/* Artist routes */}
          <Route
            path="/artworks"
            element={
              <ArtistRoute>
                <ArtworkListPage />
              </ArtistRoute>
            }
          />
          <Route
            path="/catalogues"
            element={
              <ArtistRoute>
                <CatalogueListPage />
              </ArtistRoute>
            }
          />
          <Route
            path="/contacts"
            element={
              <ArtistRoute>
                <ContactListPage />
              </ArtistRoute>
            }
          />
          <Route path="/sales" element={<SalesRoute />} />
          <Route path="/messages" element={<MessagesRoute />} />
          <Route
            path="/insights"
            element={
              <ArtistRoute>
                <ArtistInsightsPage />
              </ArtistRoute>
            }
          />
          <Route path="/settings" element={<SettingsRoute />} />

          {/* Collector routes */}
          <Route
            path="/collection"
            element={
              <CollectorRoute>
                <CollectorSalesPage />
              </CollectorRoute>
            }
          />
          <Route
            path="/inquiries"
            element={
              <CollectorRoute>
                <CollectorInquiriesPage />
              </CollectorRoute>
            }
          />
        </Route>
      </Route>
    </Route>

    {/* Catch-all */}
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

const App = () => (
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

export default App;