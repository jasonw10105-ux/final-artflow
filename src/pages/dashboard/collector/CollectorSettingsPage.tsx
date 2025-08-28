// src/pages/dashboard/collector/CollectorSettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import NotificationPanel from '@/components/ui/NotificationPanel';
import { Switch } from '@/components/ui/Switch';

const CollectorSettingsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'preferences'>('account');

  const [preferredMediums, setPreferredMediums] = useState('');
  const [preferredStyles, setPreferredStyles] = useState('');
  const [useLearnedBudget, setUseLearnedBudget] = useState(false);
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');

  const [notificationPrefs, setNotificationPrefs] = useState({
    artwork: true,
    artist: true,
    catalogue: true,
    digest: true,
    realTime: true,
    daily: true,
    weekly: true
  });

  const { data: preferences, isLoading } = useQuery({
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

      setNotificationPrefs({
        artwork: preferences.notify_artwork ?? true,
        artist: preferences.notify_artist ?? true,
        catalogue: preferences.notify_catalogue ?? true,
        digest: preferences.notify_digest ?? true,
        realTime: preferences.notify_real_time ?? true,
        daily: preferences.notify_daily ?? true,
        weekly: preferences.notify_weekly ?? true
      });
    }
  }, [preferences]);

  const mutation = useMutation({
    mutationFn: async (updatedPrefs: any) => {
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
    mutation.mutate({
      preferred_mediums: preferredMediums.split(',').map(s => s.trim()).filter(Boolean),
      preferred_styles: preferredStyles.split(',').map(s => s.trim()).filter(Boolean),
      min_budget: useLearnedBudget ? null : (minBudget ? parseFloat(minBudget) : null),
      max_budget: useLearnedBudget ? null : (maxBudget ? parseFloat(maxBudget) : null),
      use_learned_budget: useLearnedBudget,
      ...notificationPrefs
    });
  };

  const learnedBudget = preferences?.learned_preferences?.budget_range || null;

  return (
    <div>
      <h1>Collector Settings</h1>
      <p style={{ color: 'var(--muted-foreground)', marginTop: '-0.5rem', marginBottom: '2rem' }}>
        Manage your account, notifications, and preferences for better recommendations.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button className={`button ${activeTab === 'account' ? 'button-primary' : ''}`} onClick={() => setActiveTab('account')}>Account Settings</button>
        <button className={`button ${activeTab === 'notifications' ? 'button-primary' : ''}`} onClick={() => setActiveTab('notifications')}>Notification Settings</button>
        <button className={`button ${activeTab === 'preferences' ? 'button-primary' : ''}`} onClick={() => setActiveTab('preferences')}>Preferences & Learned Behavior</button>
      </div>

      {activeTab === 'account' && (
        <div className="widget">
          <h3>Account Settings</h3>
          <p>Email, password, profile details, etc.</p>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="widget">
          <h3>Notification Settings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {['artwork','artist','catalogue','digest'].map(key => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{key.charAt(0).toUpperCase() + key.slice(1)} notifications example</span>
                <Switch
                  checked={notificationPrefs[key as keyof typeof notificationPrefs]}
                  onChange={() => setNotificationPrefs(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                />
              </div>
            ))}
            <hr />
            {['realTime','daily','weekly'].map(key => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{key.charAt(0).toUpperCase() + key.slice(1)} updates example</span>
                <Switch
                  checked={notificationPrefs[key as keyof typeof notificationPrefs]}
                  onChange={() => setNotificationPrefs(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'preferences' && (
        <>
          <div className="widget" style={{ marginBottom: '2rem' }}>
            <h3>Your Preferences</h3>
            <div>
              <label>Preferred Mediums</label>
              <input type="text" value={preferredMediums} onChange={(e) => setPreferredMediums(e.target.value)} className="input"/>
            </div>
            <div>
              <label>Preferred Styles / Genres</label>
              <input type="text" value={preferredStyles} onChange={(e) => setPreferredStyles(e.target.value)} className="input"/>
            </div>
            <div>
              <label>Artwork Budget</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Switch checked={useLearnedBudget} onChange={() => setUseLearnedBudget(!useLearnedBudget)}/>
                <span>Use Learned Budget</span>
              </div>
              {useLearnedBudget ? (
                learnedBudget ? <p style={{ color:'var(--muted-foreground)' }}>System-estimated range: ${learnedBudget[0]} – ${learnedBudget[1]}</p>
                : <p style={{ color:'var(--muted-foreground)' }}>System has not learned your budget yet.</p>
              ) : (
                <div style={{ display:'flex', gap:'1rem', marginTop:'0.5rem' }}>
                  <input type="number" placeholder="Min Budget" value={minBudget} onChange={e=>setMinBudget(e.target.value)} className="input"/>
                  <input type="number" placeholder="Max Budget" value={maxBudget} onChange={e=>setMaxBudget(e.target.value)} className="input"/>
                </div>
              )}
            </div>
            <button onClick={handleSavePreferences} disabled={mutation.isPending} className="button button-primary" style={{ marginTop:'1rem' }}>
              {mutation.isPending ? 'Saving...' : 'Save Preferences'}
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
