// src/pages/dashboard/collector/CollectorSettingsPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import Toggle from '@/components/ui/Toggle'; // Reusable Toggle component - CORRECTED IMPORT
import { Trash2, User, Lock, Shield, Mail, Clock, Bell } from 'lucide-react'; // Icons (Added Bell icon)

// --- Type Definitions ---

// Notification type settings within JSONB (e.g., artwork: true, artist: false)
interface NotificationEntityTypeSettings {
  artwork: boolean;
  artist: boolean;
  catalogue: boolean;
}

// Learned budget range structure (from learned_preferences)
interface LearnedBudgetRange {
  min: number;
  max: number;
  confidence?: string;
}

// Richer LearnedPreferences structure (from user_preferences.learned_preferences)
interface LearnedPreferences {
  top_liked_mediums?: { name: string; count: number }[];
  top_liked_styles?: { name: string; count: number }[];
  preferred_price_range_from_behavior?: LearnedBudgetRange;
  overall_engagement_score?: number;
  negative_preferences?: {
    disliked_mediums?: string[];
    disliked_styles?: string[];
  };
  top_followed_artists?: { artist_id: string; full_name: string }[];
  last_learned_update?: string;
  [key: string]: any; // Allow other dynamic properties
}

// Full UserPreferences structure (from user_preferences table)
interface UserPreferences {
  user_id: string;
  preferred_mediums: string[] | null;
  preferred_styles: string[] | null;
  min_budget: number | null;
  max_budget: number | null;
  use_learned_budget: boolean | null;
  learned_preferences: LearnedPreferences | null;
  // Notification settings stored directly in user_preferences as JSONB objects
  notification_real_time: NotificationEntityTypeSettings | null;
  notification_daily: NotificationEntityTypeSettings | null;
  notification_weekly: NotificationEntityTypeSettings | null;
  
  // New granular alert lists & exclusion filters
  alert_specific_artists: string[] | null; // Storing UUIDs as strings for simplicity
  alert_specific_mediums: string[] | null;
  alert_specific_styles: string[] | null;
  exclude_mediums: string[] | null;
  exclude_styles: string[] | null;
  exclude_artists: string[] | null; // Storing UUIDs as strings
  
  notify_by_email: boolean | null;
  preferred_digest_time: string | null; // e.g., "08:00"

  updated_at: string;
}

// --- Modals (Defined within the same file for simplicity) ---

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  isDestructive?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen, onClose, onConfirm, title, message, confirmText, cancelText = 'Cancel', isDestructive = false
}) => {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <h3 style={{ color: isDestructive ? 'var(--destructive-foreground)' : 'inherit' }}>{title}</h3>
        <p style={{ marginBottom: '1.5rem' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button className="button button-secondary" onClick={onClose}>{cancelText}</button>
          <button className={`button ${isDestructive ? 'button-danger' : 'button-primary'}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Settings Page Component ---

const CollectorSettingsPage = () => {
  const { user, profile, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'preferences' | 'security'>('account');

  // --- Account Tab States ---
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // --- Preferences Tab States ---
  const [preferredMediums, setPreferredMediums] = useState('');
  const [preferredStyles, setPreferredStyles] = useState('');
  const [useLearnedBudget, setUseLearnedBudget] = useState(false);
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  // New specific alert lists
  const [alertSpecificArtists, setAlertSpecificArtists] = useState('');
  const [alertSpecificMediums, setAlertSpecificMediums] = useState('');
  const [alertSpecificStyles, setAlertSpecificStyles] = useState('');
  // New explicit exclusion filters
  const [excludeMediums, setExcludeMediums] = useState('');
  const [excludeStyles, setExcludeStyles] = useState('');
  const [excludeArtists, setExcludeArtists] = useState('');

  // --- Notification Settings Tab States ---
  const [realTimeSettings, setRealTimeSettings] = useState<NotificationEntityTypeSettings>({ artwork: true, artist: true, catalogue: true });
  const [dailySettings, setDailySettings] = useState<NotificationEntityTypeSettings>({ artwork: false, artist: false, catalogue: false });
  const [weeklySettings, setWeeklySettings] = useState<NotificationEntityTypeSettings>({ artwork: false, artist: false, catalogue: false });
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [preferredDigestTime, setPreferredDigestTime] = useState("08:00");

  // --- Modals State ---
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showClearLearnedDataConfirm, setShowClearLearnedDataConfirm] = useState(false);
  const [showResetPreferencesConfirm, setShowResetPreferencesConfirm] = useState(false);


  // --- Data Fetching (User Preferences) ---
  const { data: preferences, isLoading } = useQuery<UserPreferences | null, Error>({ // Added Error type for query
    queryKey: ['userPreferences', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: existingPrefs, error: fetchError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (fetchError && fetchError.code === 'PGRST116') {
         // If preferences don't exist, create default ones
         const { data: newPrefs, error: insertError } = await supabase
            .from('user_preferences')
            .insert({ user_id: user.id })
            .select('*')
            .single();
        if (insertError) throw insertError;
        return newPrefs;
      }
      if (fetchError) throw fetchError;
      return existingPrefs;
    },
    enabled: !!user,
  });

  // --- Populate States from Fetched Preferences ---
  useEffect(() => {
    if (preferences) {
      // General preferences
      setPreferredMediums((preferences.preferred_mediums || []).join(', '));
      setPreferredStyles((preferences.preferred_styles || []).join(', '));
      setMinBudget(preferences.min_budget?.toString() || '');
      setMaxBudget(preferences.max_budget?.toString() || '');
      setUseLearnedBudget(preferences.use_learned_budget ?? false);

      // Notification settings
      setRealTimeSettings(preferences.notification_real_time || { artwork: true, artist: true, catalogue: true });
      setDailySettings(preferences.notification_daily || { artwork: false, artist: false, catalogue: false });
      setWeeklySettings(preferences.notification_weekly || { artwork: false, artist: false, catalogue: false });
      setNotifyByEmail(preferences.notify_by_email ?? true);
      setPreferredDigestTime(preferences.preferred_digest_time || "08:00");

      // Specific alert lists & exclusion filters
      setAlertSpecificArtists((preferences.alert_specific_artists || []).join(', '));
      setAlertSpecificMediums((preferences.alert_specific_mediums || []).join(', '));
      setAlertSpecificStyles((preferences.alert_specific_styles || []).join(', '));
      setExcludeMediums((preferences.exclude_mediums || []).join(', '));
      setExcludeStyles((preferences.exclude_styles || []).join(', '));
      setExcludeArtists((preferences.exclude_artists || []).join(', '));
    }
  }, [preferences]);

  // --- Mutations for Saving (General Preferences, Notification Settings, Account Profile) ---
  const updatePreferencesMutation = useMutation<UserPreferences, Error, Partial<UserPreferences>>({ // Added types for mutation
    mutationFn: async (updatedPrefs) => {
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
      alert('Settings saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['userPreferences', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] }); // Refresh notifications
    },
    onError: (error: any) => {
      alert(`Error saving settings: ${error.message}`);
    }
  });

  const updateProfileMutation = useMutation<any, Error, { full_name?: string; username?: string; avatar_url?: string; email?: string; password?: string }>({ // Added types for mutation
    mutationFn: async (updatedProfile) => {
      if (!user) throw new Error("User not found");
      
      const { full_name, username, avatar_url, email, password } = updatedProfile;

      // Update auth.users (email, password)
      if (email || password) {
        // Only attempt to update email if it's different
        const updateAuthPayload: { email?: string; password?: string } = {};
        if (email && email !== user.email) updateAuthPayload.email = email;
        if (password) updateAuthPayload.password = password;

        if (Object.keys(updateAuthPayload).length > 0) {
            const { error: authError } = await supabase.auth.updateUser(updateAuthPayload);
            if (authError) throw authError;
        }
      }

      // Update public.profiles (full_name, username, avatar_url)
      const profileUpdates: { full_name?: string; username?: string; avatar_url?: string; updated_at: string } = { updated_at: new Date().toISOString() };
      // Only update if value is different from current profile (to avoid unnecessary updates)
      if (full_name !== undefined && full_name !== profile?.full_name) profileUpdates.full_name = full_name;
      if (username !== undefined && username !== profile?.username) profileUpdates.username = username;
      if (avatar_url !== undefined) profileUpdates.avatar_url = avatar_url; // Avatar URL always updates if changed

      if (Object.keys(profileUpdates).length > 1) { // >1 because updated_at is always there
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .update(profileUpdates) // Use update instead of upsert for existing profile
            .eq('id', user.id)
            .select()
            .single();
          if (profileError) throw profileError;
          return profileData;
      }
      return null; // No profile updates if only updated_at is different or no changes
    },
    onSuccess: () => {
      alert('Account settings updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['user'] }); // Refresh auth user data
      queryClient.invalidateQueries({ queryKey: ['profile'] }); // Refresh profile data
    },
    onError: (error: any) => {
      alert(`Error updating account: ${error.message}`);
    }
  });


  // --- Handlers for Saving ---
  const handleSaveAccountSettings = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      alert('New password and confirmation do not match.');
      return;
    }
    
    // Collect all updates
    const updates: { full_name?: string; username?: string; avatar_url?: string; email?: string; password?: string } = {};
    if (fullName !== profile?.full_name) updates.full_name = fullName;
    if (username !== profile?.username) updates.username = username;
    if (email !== user?.email) updates.email = email;
    if (newPassword) updates.password = newPassword;
    // Avatar is handled separately

    if (Object.keys(updates).length > 0) {
      updateProfileMutation.mutate(updates);
    } else {
      alert('No changes to save in account settings.');
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || event.target.files.length === 0) {
      alert('Please select an image to upload.');
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    setIsUploadingAvatar(true);
    try {
      const { data, error: uploadError } = await supabase.storage
        .from('avatars') // Your storage bucket name
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true, // Allow overwriting if file with same name exists
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;

      // Remove old avatar if it exists and is different (optional, requires more logic to track old URL)
      // For now, just update to new URL. Supabase storage will manage actual files.

      updateProfileMutation.mutate({ avatar_url: publicUrl }); // Update profile with new avatar URL

    } catch (error: any) {
      alert(`Avatar upload error: ${error.message}`);
    } finally {
      setIsUploadingAvatar(false);
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = ''; // Clear file input
      }
    }
  };


  const handleSavePreferences = () => {
    const parsedAlertSpecificArtists = alertSpecificArtists.split(',').map(s => s.trim()).filter(Boolean);
    const parsedAlertSpecificMediums = alertSpecificMediums.split(',').map(s => s.trim()).filter(Boolean);
    const parsedAlertSpecificStyles = alertSpecificStyles.split(',').map(s => s.trim()).filter(Boolean);
    const parsedExcludeMediums = excludeMediums.split(',').map(s => s.trim()).filter(Boolean);
    const parsedExcludeStyles = excludeStyles.split(',').map(s => s.trim()).filter(Boolean);
    const parsedExcludeArtists = excludeArtists.split(',').map(s => s.trim()).filter(Boolean);


    const mediums = preferredMediums.split(',').map(s => s.trim()).filter(Boolean);
    const styles = preferredStyles.split(',').map(s => s.trim()).filter(Boolean);

    updatePreferencesMutation.mutate({
      preferred_mediums: mediums,
      preferred_styles: styles,
      min_budget: useLearnedBudget ? null : (minBudget ? parseFloat(minBudget) : null),
      max_budget: useLearnedBudget ? null : (maxBudget ? parseFloat(maxBudget) : null),
      use_learned_budget: useLearnedBudget,
      alert_specific_artists: parsedAlertSpecificArtists,
      alert_specific_mediums: parsedAlertSpecificMediums,
      alert_specific_styles: parsedAlertSpecificStyles,
      exclude_mediums: parsedExcludeMediums,
      exclude_styles: parsedExcludeStyles,
      exclude_artists: parsedExcludeArtists,
    });
  };

  const handleSaveNotificationSettings = () => {
    updatePreferencesMutation.mutate({
      notification_real_time: realTimeSettings,
      notification_daily: dailySettings,
      notification_weekly: weeklySettings,
      notify_by_email: notifyByEmail,
      preferred_digest_time: preferredDigestTime,
    });
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      // NOTE: Deleting a user via `supabase.auth.admin.deleteUser` typically requires
      // a service role key and should ideally be done on the server-side to prevent
      // exposing sensitive keys. For client-side, `supabase.auth.deleteUser()` (if enabled
      // for client-side) might be used, but it's more restrictive.
      // If `supabase.auth.admin.deleteUser` is used here, ensure your RLS policies
      // and security considerations are robust.
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) throw error;
      alert('Your account has been deleted successfully.');
      signOut(); // Log out the user
    } catch (error: any) {
      alert(`Error deleting account: ${error.message}`);
    }
  };

  const handleClearLearnedData = async () => {
    if (!user) return;
    try {
      // Set learned_preferences to an empty object or null, depending on your schema.
      // Assuming it's JSONB, an empty object `{}` is usually fine to clear its content.
      await updatePreferencesMutation.mutateAsync({ learned_preferences: {} });
      alert('Learned behavior data cleared. The system will start learning fresh.');
      setShowClearLearnedDataConfirm(false);
    } catch (error) {
      alert(`Error clearing data: ${error.message}`);
    }
  };

  const handleResetAllPreferences = async () => {
    if (!user) return;
    try {
      await updatePreferencesMutation.mutateAsync({
        preferred_mediums: [],
        preferred_styles: [],
        min_budget: null,
        max_budget: null,
        use_learned_budget: false,
        alert_specific_artists: [],
        alert_specific_mediums: [],
        alert_specific_styles: [],
        exclude_mediums: [],
        exclude_styles: [],
        exclude_artists: [],
        notification_real_time: { artwork: true, artist: true, catalogue: true },
        notification_daily: { artwork: false, artist: false, catalogue: false },
        notification_weekly: { artwork: false, artist: false, catalogue: false },
        notify_by_email: true,
        preferred_digest_time: "08:00",
        // Do NOT reset learned_preferences here, that's a separate action
      });
      alert('All preferences reset to default.');
      setShowResetPreferencesConfirm(false);
    } catch (error) {
      alert(`Error resetting preferences: ${error.message}`);
    }
  };


  const learnedBudget = preferences?.learned_preferences?.preferred_price_range_from_behavior || null;

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
        <button
          className={`button ${activeTab === 'security' ? 'button-primary' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Security & Privacy
        </button>
      </div>

      {/* --- Account Settings Tab --- */}
      {activeTab === 'account' && (
        <div className="widget" style={{ padding: '1.5rem', borderRadius: 'var(--radius)' }}>
          <h3><User size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Profile Information</h3>
          <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <img
              src={profile?.avatar_url || 'https://placehold.co/64x64'}
              alt="Avatar"
              style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                ref={avatarFileInputRef}
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
                disabled={isUploadingAvatar}
              />
              <button
                className="button button-secondary button-sm"
                onClick={() => avatarFileInputRef.current?.click()}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? 'Uploading...' : 'Change Avatar'}
              </button>
            </div>
          </div>
          
          <label style={styles.label}>Full Name</label>
          <input type="text" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />

          <label style={styles.label}>Username</label>
          <input type="text" className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
          
          <h3 style={{ marginTop: '2rem' }}><Lock size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Password & Security</h3>
          <label style={styles.label}>Email</label>
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label style={styles.label}>New Password</label>
          <input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Leave blank to keep current password" />
          
          <label style={styles.label}>Confirm New Password</label>
          <input type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />

          <button onClick={handleSaveAccountSettings} disabled={updateProfileMutation.isPending} className="button button-primary" style={{ marginTop: '1.5rem' }}>
            {updateProfileMutation.isPending ? 'Saving...' : 'Save Account Settings'}
          </button>

          <h3 style={{ marginTop: '2rem', color: 'var(--destructive-foreground)' }}><Trash2 size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Delete Account</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button className="button button-danger" onClick={() => setShowDeleteAccountModal(true)}>
            Delete My Account
          </button>
        </div>
      )}

      {/* --- Notification Settings Tab --- */}
      {activeTab === 'notifications' && (
        <div className="widget" style={{ padding: '1.5rem', borderRadius: 'var(--radius)' }}>
          <h3><Bell size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Notification Settings</h3>
          <p style={{ marginBottom: '1.5rem', color: 'var(--muted-foreground)' }}>
            Choose how and when you want to receive updates.
          </p>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>Real-Time Alerts</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
              Receive instant notifications for new items matching your preferences.
            </p>
            {['artwork', 'artist', 'catalogue'].map(type => (
              <div key={type} style={styles.toggleRow}>
                <span>New {type.charAt(0).toUpperCase() + type.slice(1)}</span>
                <Toggle
                  checked={realTimeSettings[type as keyof NotificationEntityTypeSettings]}
                  onChange={(val) => setRealTimeSettings(prev => ({ ...prev, [type]: val }))}
                />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>Daily Digest</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
              Get a daily summary of new recommendations and updates.
            </p>
            {['artwork', 'artist', 'catalogue'].map(type => (
              <div key={type} style={styles.toggleRow}>
                <span>{type.charAt(0).toUpperCase() + type.slice(1)} Summary</span>
                {/* Note: In your original code, NotificationTypeSettings was used here,
                    but NotificationEntityTypeSettings is defined above. Assuming you meant the latter. */}
                <Toggle
                  checked={dailySettings[type as keyof NotificationEntityTypeSettings]}
                  onChange={(val) => setDailySettings(prev => ({ ...prev, [type]: val }))}
                />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>Weekly Digest</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
              Get a weekly summary of new recommendations and updates.
            </p>
            {['artwork', 'artist', 'catalogue'].map(type => (
              <div key={type} style={styles.toggleRow}>
                <span>{type.charAt(0).toUpperCase() + type.slice(1)} Summary</span>
                {/* Note: In your original code, NotificationTypeSettings was used here,
                    but NotificationEntityTypeSettings is defined above. Assuming you meant the latter. */}
                <Toggle
                  checked={weeklySettings[type as keyof NotificationEntityTypeSettings]}
                  onChange={(val) => setWeeklySettings(prev => ({ ...prev, [type]: val }))}
                />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem' }}><Mail size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Email Preferences</h4>
            <div style={styles.toggleRow}>
                <span>Receive all notifications by email</span>
                <Toggle checked={notifyByEmail} onChange={setNotifyByEmail} />
            </div>
            {user?.email && <p style={{fontSize:'0.8rem', color:'var(--muted-foreground)'}}>Primary email: {user.email}</p>}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '1rem' }}><Clock size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Preferred Digest Time</h4>
            <input 
                type="time" 
                className="input" 
                value={preferredDigestTime} 
                onChange={(e) => setPreferredDigestTime(e.target.value)} 
                style={{maxWidth: '150px'}}
            />
            <p style={{fontSize:'0.8rem', color:'var(--muted-foreground)', marginTop:'0.5rem'}}>Digests will be sent around this time in your local timezone.</p>
          </div>

          <h3 style={{ marginTop: '2rem' }}>Specific Alerts</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
            Get notifications for new content from specific artists, mediums, or styles.
          </p>

          <label style={styles.label}>Alert Me About Specific Artists (IDs, comma-separated)</label>
          <input type="text" className="input" value={alertSpecificArtists} onChange={(e) => setAlertSpecificArtists(e.target.value)} placeholder="e.g., uuid1, uuid2" />
          <label style={styles.label}>Alert Me About Specific Mediums (comma-separated)</label>
          <input type="text" className="input" value={alertSpecificMediums} onChange={(e) => setAlertSpecificMediums(e.target.value)} placeholder="e.g., Oil, Sculpture" />
          <label style={styles.label}>Alert Me About Specific Styles (comma-separated)</label>
          <input type="text" className="input" value={alertSpecificStyles} onChange={(e) => setAlertSpecificStyles(e.target.value)} placeholder="e.g., Abstract, Impressionist" />
          
          <button onClick={handleSaveNotificationSettings} disabled={updatePreferencesMutation.isPending} className="button button-primary" style={{ marginTop: '1.5rem' }}>
            {updatePreferencesMutation.isPending ? 'Saving...' : 'Save Notification Settings'}
          </button>
        </div>
      )}

      {/* --- Preferences & Learned Behavior Tab --- */}
      {activeTab === 'preferences' && (
        <>
          <div className="widget" style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: 'var(--radius)' }}>
            <h3>Your Preferences</h3>
            <div style={{ marginTop: '1rem' }}>
              <label style={styles.label}>Preferred Mediums (comma-separated)</label>
              <input
                type="text"
                value={preferredMediums}
                onChange={(e) => setPreferredMediums(e.target.value)}
                className="input"
              />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <label style={styles.label}>Preferred Styles / Genres (comma-separated)</label>
              <input
                type="text"
                value={preferredStyles}
                onChange={(e) => setPreferredStyles(e.target.value)}
                className="input"
              />
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label style={styles.label}>Artwork Budget</label>
              <div style={styles.toggleRow}>
                <Toggle checked={useLearnedBudget} onChange={(val) => setUseLearnedBudget(val)} />
                <span>Use System-Learned Budget</span>
              </div>

              {useLearnedBudget ? (
                learnedBudget && learnedBudget.min !== undefined && learnedBudget.max !== undefined ? (
                  <p style={{ marginTop: '0.5rem', color: 'var(--muted-foreground)' }}>
                    System-estimated range: ${learnedBudget.min.toFixed(2)} – ${learnedBudget.max.toFixed(2)} (Confidence: {learnedBudget.confidence || 'none'})
                  </p>
                ) : (
                  <p style={{ marginTop: '0.5rem', color: 'var(--muted-foreground)' }}>
                    System has not learned your budget yet. Keep interacting to help it learn!
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
            
            {/* Action buttons for preferences */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button 
                    className="button button-secondary" 
                    onClick={() => setShowResetPreferencesConfirm(true)}
                >
                    Reset All Preferences
                </button>
                <button
                    onClick={handleSavePreferences}
                    disabled={updatePreferencesMutation.isPending}
                    className="button button-primary"
                >
                    {updatePreferencesMutation.isPending ? 'Saving...' : 'Save Preferences'}
                </button>
            </div>
          </div>

          {/* Learned Behavior */}
          <div className="widget" style={{ padding: '1.5rem', borderRadius: 'var(--radius)' }}>
            <h3>What We've Learned About You</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                These are insights our system has gathered about your tastes and interests.
            </p>
            {preferences?.learned_preferences && Object.keys(preferences.learned_preferences).length > 0 ? (
              <ul>
                {Object.entries(preferences.learned_preferences).map(([key, value]) => (
                  <li key={key} style={{marginBottom: '0.5rem'}}>
                    <strong>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {JSON.stringify(value)}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No learned preferences to show yet. Interact with artworks to help the system learn.</p>
            )}
            <button 
                className="button button-secondary button-sm" 
                onClick={() => setShowClearLearnedDataConfirm(true)} 
                style={{marginTop: '1rem'}}
            >
                Clear Learned Data
            </button>
          </div>

          {/* Explicit Exclusion Filters */}
          <div className="widget" style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: 'var(--radius)' }}>
            <h3>Explicit Exclusion Filters</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
              Tell us what you absolutely DO NOT want to see in your recommendations.
            </p>
            <label style={styles.label}>Exclude Mediums (comma-separated)</label>
            <input type="text" className="input" value={excludeMediums} onChange={(e) => setExcludeMediums(e.target.value)} placeholder="e.g., Photography, Digital Art" />
            <label style={styles.label}>Exclude Styles (comma-separated)</label>
            <input type="text" className="input" value={excludeStyles} onChange={(e) => setExcludeStyles(e.target.value)} placeholder="e.g., Pop Art, Graffiti" />
            <label style={styles.label}>Exclude Artists (IDs, comma-separated)</label>
            <input type="text" className="input" value={excludeArtists} onChange={(e) => setExcludeArtists(e.target.value)} placeholder="e.g., uuid1, uuid2" />
            
            <button onClick={handleSavePreferences} disabled={updatePreferencesMutation.isPending} className="button button-primary" style={{ marginTop: '1.5rem' }}>
              {updatePreferencesMutation.isPending ? 'Saving...' : 'Save Exclusion Filters'}
            </button>
          </div>

        </>
      )}

      {/* --- Security & Privacy Tab --- */}
      {activeTab === 'security' && (
        <div className="widget" style={{ padding: '1.5rem', borderRadius: 'var(--radius)' }}>
          <h3><Shield size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Security & Privacy</h3>
          
          <h4 style={{marginTop: '1rem'}}>Data Policy & Terms</h4>
          <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
            Review our <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="link">Privacy Policy</a> and <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="link">Terms of Service</a>.
          </p>

          <h4 style={{marginTop: '1rem'}}>Consent Management</h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
            Manage your preferences for cookies and how your data is used for analytics and personalization.
          </p>
          <button className="button button-secondary">Manage Cookie Preferences</button> {/* Placeholder */}

          <h4 style={{marginTop: '1rem'}}>Data Access Request</h4>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
            Request a copy of all personal data we hold about you. This process may take up to 30 days.
          </p>
          <button className="button button-secondary">Request My Data</button> {/* Placeholder */}
        </div>
      )}

      {/* --- Confirmation Modals --- */}
      <ConfirmationModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onConfirm={handleDeleteAccount}
        title="Confirm Account Deletion"
        message="Are you absolutely sure you want to delete your account? All your data, preferences, and activity will be permanently lost. This action cannot be undone."
        confirmText="Delete Account"
        isDestructive
      />
      <ConfirmationModal
        isOpen={showClearLearnedDataConfirm}
        onClose={() => setShowClearLearnedDataConfirm(false)} // CORRECTED TYPO HERE
        onConfirm={handleClearLearnedData}
        title="Clear Learned Behavior Data"
        message="This will erase all data the system has learned about your preferences. Your recommendations will start fresh. Are you sure?"
        confirmText="Clear Data"
        isDestructive
      />
      <ConfirmationModal
        isOpen={showResetPreferencesConfirm}
        onClose={() => setShowResetPreferencesConfirm(false)}
        onConfirm={handleResetAllPreferences}
        title="Reset All Preferences"
        message="This will reset all your preferences (mediums, styles, budget, alerts, exclusions) to their default values. Are you sure?"
        confirmText="Reset Preferences"
        isDestructive
      />
    </div>
  );
};

// --- Styles (for consistent layout) ---
const styles: { [key: string]: React.CSSProperties } = {
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
    color: 'var(--foreground)',
    marginTop: '1rem',
  },
};

export default CollectorSettingsPage;