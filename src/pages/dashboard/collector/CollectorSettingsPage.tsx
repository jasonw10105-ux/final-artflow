// src/pages/dashboard/collector/CollectorSettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';

const CollectorSettingsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'preferences'>('account');

  const [preferredMediums, setPreferredMediums] = useState('');
  const [preferredStyles, setPreferredStyles] = useState('');
  const [useLearnedBudget, setUseLearnedBudget] = useState(false);
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');

  // --------------------------
  // FETCH USER PREFERENCES
  // --------------------------
  const { data: preferences } = useQuery({
    queryKey: ['userPreferences', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (preferences) {
      setPreferredMediums((preferences.preferred_mediums || []).join(', '));
      setPreferredStyles((preferences.preferred_styles || []).join(', '));
      setMinBudget(preferences.min_budget || '');
      setMaxBudget(preferences.max_budget || '');
      setUseLearnedBudget(false);
    }
  }, [preferences]);

  // --------------------------
  // SAVE USER PREFERENCES
  // --------------------------
  const preferencesMutation = useMutation({
    mutationFn: async (updatedPrefs: {
      preferred_mediums: string[];
      preferred_styles: string[];
      min_budget: number | null;
      max_budget: number | null;
      use_learned_budget: boolean;
    }) => {
      if (!user) throw new Error("User not found");
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: user.id,
            ...updatedPrefs,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      alert('Preferences saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['userPreferences', user?.id] });
    },
    onError: (error: any) => {
      alert(`Error saving preferences: ${error.message}`);
    },
  });

  const handleSavePreferences = () => {
    const mediums = preferredMediums.split(',').map((s) => s.trim()).filter(Boolean);
    const styles = preferredStyles.split(',').map((s) => s.trim()).filter(Boolean);

    preferencesMutation.mutate({
      preferred_mediums: mediums,
      preferred_styles: styles,
      min_budget: useLearnedBudget ? null : (minBudget ? parseFloat(minBudget) : null),
      max_budget: useLearnedBudget ? null : (maxBudget ? parseFloat(maxBudget) : null),
      use_learned_budget: useLearnedBudget,
    });
  };

  const learnedBudget = preferences?.learned_preferences?.budget_range || null;

  // --------------------------
  // FETCH NOTIFICATION PREFS
  // --------------------------
  const { data: notificationPrefs } = useQuery({
    queryKey: ['notificationPreferences', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });

  // --------------------------
  // SAVE NOTIFICATION PREFS
  // --------------------------
  const notificationMutation = useMutation({
    mutationFn: async (updatedPrefs: {
      notify_realtime_artworks: boolean;
      notify_realtime_catalogues: boolean;
      notify_realtime_artists: boolean;
      notify_daily: boolean;
      notify_weekly: boolean;
      preferred_digest_time: string;
    }) => {
      if (!user) throw new Error("User not found");
      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: user.id,
            ...updatedPrefs,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      alert('Notification settings saved!');
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences', user?.id] });
    },
    onError: (error: any) => {
      alert(`Error saving notification preferences: ${error.message}`);
    },
  });

  const [notifyRealtimeArtworks, setNotifyRealtimeArtworks] = useState(false);
  const [notifyRealtimeCatalogues, setNotifyRealtimeCatalogues] = useState(false);
  const [notifyRealtimeArtists, setNotifyRealtimeArtists] = useState(false);
  const [notifyDaily, setNotifyDaily] = useState(false);
  const [notifyWeekly, setNotifyWeekly] = useState(false);
  const [digestTime, setDigestTime] = useState("08:00");

  useEffect(() => {
    if (notificationPrefs) {
      setNotifyRealtimeArtworks(notificationPrefs.notify_realtime_artworks);
      setNotifyRealtimeCatalogues(notificationPrefs.notify_realtime_catalogues);
      setNotifyRealtimeArtists(notificationPrefs.notify_realtime_artists);
      setNotifyDaily(notificationPrefs.notify_daily);
      setNotifyWeekly(notificationPrefs.notify_weekly);
      setDigestTime(notificationPrefs.preferred_digest_time || "08:00");
    }
  }, [notificationPrefs]);

  const handleSaveNotifications = () => {
    notificationMutation.mutate({
      notify_realtime_artworks: notifyRealtimeArtworks,
      notify_realtime_catalogues: notifyRealtimeCatalogues,
      notify_realtime_artists: notifyRealtimeArtists,
      notify_daily: notifyDaily,
      notify_weekly: notifyWeekly,
      preferred_digest_time: digestTime,
    });
  };

  // --------------------------
  // RENDER
  // --------------------------
  return (
    <div>
      <h1>Collector Settings</h1>
      <p style={{ color: 'var(--muted-foreground)', marginTop: '-0.5rem', marginBottom: '2rem' }}>
        Manage your account, notifications, and preferences for better recommendations.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          className={`button ${activeTab === 'account' ? 'button-primary' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          Account Settings
        </button>
        <button
          className={`button ${activeTab === 'notifications' ? 'button-primary' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          Notification Settings
        </button>
        <button
          className={`button ${activeTab === 'preferences' ? 'button-primary' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          Preferences & Learned Behavior
        </button>
      </div>

      {/* Account */}
      {activeTab === 'account' && (
        <div className="widget">
          <h3>Account Settings</h3>
          <p>Email, password, profile details, etc.</p>
          {/* TODO: account settings form */}
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="widget">
          <h3>Notification Settings</h3>
          <p>Choose how and when you want to receive notifications.</p>

          <div style={{ marginTop: '1rem' }}>
            <label>
              <input
                type="checkbox"
                checked={notifyRealtimeArtworks}
                onChange={() => setNotifyRealtimeArtworks(!notifyRealtimeArtworks)}
              /> Real-time: New artworks
            </label>
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                checked={notifyRealtimeCatalogues}
                onChange={() => setNotifyRealtimeCatalogues(!notifyRealtimeCatalogues)}
              /> Real-time: New catalogues
            </label>
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                checked={notifyRealtimeArtists}
                onChange={() => setNotifyRealtimeArtists(!notifyRealtimeArtists)}
              /> Real-time: New artists
            </label>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <label>
              <input
                type="checkbox"
                checked={notifyDaily}
                onChange={() => setNotifyDaily(!notifyDaily)}
              /> Daily Digest
            </label>
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                checked={notifyWeekly}
                onChange={() => setNotifyWeekly(!notifyWeekly)}
              /> Weekly Digest
            </label>
          </div>

          {(notifyDaily || notifyWeekly) && (
            <div style={{ marginTop: '1rem' }}>
              <label>Preferred Digest Time</label>
              <input
                type="time"
                value={digestTime}
                onChange={(e) => setDigestTime(e.target.value)}
                className="input"
              />
            </div>
          )}

          <button
            onClick={handleSaveNotifications}
            disabled={notificationMutation.isPending}
            className="button button-primary"
            style={{ marginTop: '1.5rem' }}
          >
            {notificationMutation.isPending ? 'Saving...' : 'Save Notification Settings'}
          </button>
        </div>
      )}

      {/* Preferences */}
      {activeTab === 'preferences' && (
        <>
          <div className="widget" style={{ marginBottom: '2rem' }}>
            <h3>Your Preferences</h3>
            <div style={{ marginTop: '1rem' }}>
              <label>Preferred Mediums</label>
              <input
                type="text"
                value={preferredMediums}
                onChange={(e) => setPreferredMediums(e.target.value)}
                className="input"
              />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <label>Preferred Styles / Genres</label>
              <input
                type="text"
                value={preferredStyles}
                onChange={(e) => setPreferredStyles(e.target.value)}
                className="input"
              />
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label>Artwork Budget</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                  type="checkbox"
                  checked={useLearnedBudget}
                  onChange={() => setUseLearnedBudget(!useLearnedBudget)}
                />
                <span>Use Learned Budget</span>
              </div>

              {useLearnedBudget ? (
                learnedBudget ? (
                  <p style={{ marginTop: '0.5rem', color: 'var(--muted-foreground)' }}>
                    System-estimated range: ${learnedBudget[0]} – ${learnedBudget[1]}
                  </p>
                ) : (
                  <p style={{ marginTop: '0.5rem', color: 'var(--muted-foreground)' }}>
                    System has not learned your budget yet.
                  </p>
                )
              ) : (
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <input
                    type="number"
                    placeholder="Min Budget"
                    value={minBudget}
                    onChange={(e) => setMinBudget(e.target.value)}
                    className="input"
                  />
                  <input
                    type="number"
                    placeholder="Max Budget"
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(e.target.value)}
                    className="input"
                  />
                </div>
              )}
            </div>

            <button
              onClick={handleSavePreferences}
              disabled={preferencesMutation.isPending}
              className="button button-primary"
              style={{ marginTop: '1.5rem' }}
            >
              {preferencesMutation.isPending ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>

          <div className="widget">
            <h3>Learned Behavior</h3>
            {preferences?.learned_preferences ? (
              <ul>
                {Object.entries(preferences.learned_preferences as object).map(([key, value]) => (
                  <li key={key}>{`${key}: ${JSON.stringify(value)}`}</li>
                ))}
              </ul>
            ) : (
              <p>No learned preferences to show yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CollectorSettingsPage;
