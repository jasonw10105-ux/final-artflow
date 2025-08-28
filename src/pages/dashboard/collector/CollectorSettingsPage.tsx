// src/pages/dashboard/collector/CollectorSettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { Switch } from '@/components/ui/Switch'; // assume a reusable Switch component
import NotificationPanel from '@/components/ui/NotificationPanel';

interface LearnedPreferences {
  [key: string]: any;
}

interface UserPreferences {
  preferred_mediums: string[];
  preferred_styles: string[];
  min_budget: number | null;
  max_budget: number | null;
  use_learned_budget: boolean;
  learned_preferences: LearnedPreferences;
  notification_real_time: { artwork: boolean; artist: boolean; catalogue: boolean };
  notification_daily: { artwork: boolean; artist: boolean; catalogue: boolean };
  notification_weekly: { artwork: boolean; artist: boolean; catalogue: boolean };
}

const CollectorSettingsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'preferences'>('account');

  // Preferences state
  const [preferredMediums, setPreferredMediums] = useState('');
  const [preferredStyles, setPreferredStyles] = useState('');
  const [useLearnedBudget, setUseLearnedBudget] = useState(false);
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');

  // Notification toggles
  const [realTime, setRealTime] = useState({ artwork: true, artist: true, catalogue: true });
  const [daily, setDaily] = useState({ artwork: true, artist: true, catalogue: true });
  const [weekly, setWeekly] = useState({ artwork: true, artist: true, catalogue: true });

  const { data: preferences, isLoading } = useQuery<UserPreferences | null>({
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

  // populate states
  useEffect(() => {
    if (preferences) {
      setPreferredMediums((preferences.preferred_mediums || []).join(', '));
      setPreferredStyles((preferences.preferred_styles || []).join(', '));
      setMinBudget(preferences.min_budget || '');
      setMaxBudget(preferences.max_budget || '');
      setUseLearnedBudget(preferences.use_learned_budget || false);

      setRealTime(preferences.notification_real_time || { artwork: true, artist: true, catalogue: true });
      setDaily(preferences.notification_daily || { artwork: true, artist: true, catalogue: true });
      setWeekly(preferences.notification_weekly || { artwork: true, artist: true, catalogue: true });
    }
  }, [preferences]);

  const mutation = useMutation({
    mutationFn: async (updatedPrefs: Partial<UserPreferences>) => {
      if (!user) throw new Error('User not found');
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
      alert('Settings saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['userPreferences', user?.id] });
    },
    onError: (error: any) => alert(`Error saving settings: ${error.message}`),
  });

  const handleSavePreferences = () => {
    const mediums = preferredMediums.split(',').map(s => s.trim()).filter(Boolean);
    const styles = preferredStyles.split(',').map(s => s.trim()).filter(Boolean);

    mutation.mutate({
      preferred_mediums: mediums,
      preferred_styles: styles,
      min_budget: useLearnedBudget ? null : (minBudget ? parseFloat(minBudget) : null),
      max_budget: useLearnedBudget ? null : (maxBudget ? parseFloat(maxBudget) : null),
      use_learned_budget: useLearnedBudget,
      notification_real_time: realTime,
      notification_daily: daily,
      notification_weekly: weekly,
    });
  };

  const learnedBudget = preferences?.learned_preferences?.budget_range || null;

  // Example notifications for settings UI
  const exampleNotifications = {
    artwork: 'New oil painting by a rising artist in your preferred color palette',
    artist: 'Your followed artist uploaded a new artwork',
    catalogue: 'New sculpture catalog matching your budget and style preferences',
  };

  if (isLoading) return <p>Loading settings...</p>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
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

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="widget">
          <h3>Account Settings</h3>
          <p>Email, password, profile details, etc.</p>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="widget" style={{ padding: '1.5rem', borderRadius: 'var(--radius)' }}>
          <h3>Notification Settings</h3>
          <p>Toggle how and when you want to receive notifications. Example:</p>
          <ul>
            <li><strong>Artwork:</strong> {exampleNotifications.artwork}</li>
            <li><strong>Artist:</strong> {exampleNotifications.artist}</li>
            <li><strong>Catalogue:</strong> {exampleNotifications.catalogue}</li>
          </ul>

          {/* Notification toggles */}
          <div style={{ marginTop: '1rem' }}>
            <h4>Real-Time Notifications</h4>
            {['artwork', 'artist', 'catalogue'].map(key => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
                <Switch
                  checked={realTime[key as keyof typeof realTime]}
                  onChange={(val) => setRealTime(prev => ({ ...prev, [key]: val }))}
                />
                <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
              </div>
            ))}

            <h4 style={{ marginTop: '1rem' }}>Daily Digest</h4>
            {['artwork', 'artist', 'catalogue'].map(key => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
                <Switch
                  checked={daily[key as keyof typeof daily]}
                  onChange={(val) => setDaily(prev => ({ ...prev, [key]: val }))}
                />
                <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
              </div>
            ))}

            <h4 style={{ marginTop: '1rem' }}>Weekly Digest</h4>
            {['artwork', 'artist', 'catalogue'].map(key => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
                <Switch
                  checked={weekly[key as keyof typeof weekly]}
                  onChange={(val) => setWeekly(prev => ({ ...prev, [key]: val }))}
                />
                <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <>
          {/* Preferences Form */}
          <div className="widget" style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: 'var(--radius)' }}>
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
                <Switch checked={useLearnedBudget} onChange={(val) => setUseLearnedBudget(val)} />
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
              disabled={mutation.isPending}
              className="button button-primary"
              style={{ marginTop: '1.5rem' }}
            >
              {mutation.isPending ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>

          {/* Learned Behavior */}
          <div className="widget" style={{ padding: '1.5rem', borderRadius: 'var(--radius)' }}>
            <h3>Learned Behavior</h3>
            {preferences?.learned_preferences ? (
              <ul>
                {Object.entries(preferences.learned_preferences).map(([key, value]) => (
                  <li key={key}>
                    <strong>{key}:</strong> {JSON.stringify(value)}
                  </li>
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
