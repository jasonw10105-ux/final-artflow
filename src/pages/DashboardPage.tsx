// src/pages/dashboard/DashboardPage.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthProvider';

// Import your existing dashboard pages
import ArtistDashboardPage from './artist/ArtistDashboardPage';
import CollectorDashboardPage from './collector/CollectorDashboardPage';

const DashboardPage = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading Dashboard...</p>
      </div>
    );
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

  // If role is undefined or unknown, fallback to login
  return <Navigate to="/login" replace />;
};

export default DashboardPage;