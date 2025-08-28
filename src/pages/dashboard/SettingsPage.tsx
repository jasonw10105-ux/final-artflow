// src/pages/dashboard/SettingsPage.tsx
import React from 'react';
import { useAuth } from '../../contexts/AuthProvider';
import ArtistSettingsPage from './artist/ArtistSettingsPage';
import CollectorSettingsPage from './collector/CollectorSettingsPage';

const SettingsPage = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading Settings...</p>
      </div>
    );
  }

  if (!profile) {
    // Optional: Redirect or display message if no profile
    return <p>Unauthorized</p>;
  }

  // Render artist settings for artist or both roles
  if (profile.role === 'artist' || profile.role === 'both') {
    return <ArtistSettingsPage />;
  }

  // Render collector settings for collector role only
  if (profile.role === 'collector') {
    return <CollectorSettingsPage />;
  }

  return <p>Access denied</p>;
};

export default SettingsPage;