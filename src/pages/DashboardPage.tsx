// src/pages/dashboard/DashboardPage.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthProvider';

// Import your existing dashboard pages
import ArtistDashboardPage from './artist/ArtistDashboardPage';
import CollectorDashboardPage from './collector/CollectorDashboardPage';

// Assuming useAuth context might provide an error state
interface AuthProfile {
  id: string;
  email: string;
  profile_completed: boolean;
  role: 'artist' | 'collector' | 'both' | null; // Explicit union type
  // ... other profile properties
}

interface AuthContextType {
  profile: AuthProfile | null;
  loading: boolean;
  error: Error | null; // Added error state
  // ... other auth context properties
}

const DashboardPage = () => {
  // Assuming useAuth now provides an error state
  const { profile, loading, error } = useAuth() as AuthContextType; // Cast to assume error is present

  if (loading) {
    return (
      <div className="dashboard-loading-skeleton"> {/* Use a dedicated CSS class for a better loading visual */}
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  // Handle potential authentication errors explicitly
  if (error) {
    console.error("Authentication error loading dashboard:", error);
    // Redirect to an error page or display a specific error message
    return <Navigate to="/error" replace state={{ errorMessage: error.message }} />;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (!profile.profile_completed) {
    return <Navigate to="/complete-profile" replace />;
  }

  if (profile.role === 'artist' || profile.role === 'both') {
    return <ArtistDashboardPage />;
  }

  if (profile.role === 'collector') {
    return <CollectorDashboardPage />;
  }

  // Fallback for an undefined or unknown role, ideally should not happen with strong typing
  console.warn("User has an unknown or unhandled role, redirecting to login:", profile.role);
  return <Navigate to="/login" replace />;
};

export default DashboardPage;