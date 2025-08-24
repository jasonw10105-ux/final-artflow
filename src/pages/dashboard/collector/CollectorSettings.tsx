// src/pages/dashboard/collector/CollectorSettingsPage.tsx

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';

const CollectorSettingsPage = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [preferredMediums, setPreferredMediums] = useState('');
    const [preferredStyles, setPreferredStyles] = useState('');

    const { data: preferences, isLoading } = useQuery({
        queryKey: ['userPreferences', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).single();
            if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
                throw error;
            }
            return data;
        },
        enabled: !!user,
        onSuccess: (data) => {
            if (data) {
                setPreferredMediums((data.preferred_mediums || []).join(', '));
                setPreferredStyles((data.preferred_styles || []).join(', '));
            }
        }
    });

    const mutation = useMutation({
        mutationFn: async (updatedPrefs: { preferred_mediums: string[], preferred_styles: string[] }) => {
            if (!user) throw new Error("User not found");
            const { data, error } = await supabase.from('user_preferences').upsert({
                user_id: user.id,
                ...updatedPrefs,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' }).select().single();
            
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            alert('Preferences saved successfully!');
            queryClient.invalidateQueries({ queryKey: ['userPreferences', user?.id] });
        },
        onError: (error) => {
            alert(`Error saving preferences: ${error.message}`);
        }
    });

    const handleSave = () => {
        const mediums = preferredMediums.split(',').map(s => s.trim()).filter(Boolean);
        const styles = preferredStyles.split(',').map(s => s.trim()).filter(Boolean);
        mutation.mutate({ preferred_mediums: mediums, preferred_styles: styles });
    };

    if (isLoading) return <p>Loading settings...</p>;

    return (
        <div>
            <h1>Collector Settings</h1>
            <p style={{ color: 'var(--muted-foreground)', marginTop: '-0.5rem', marginBottom: '2rem' }}>Manage your preferences to get better recommendations.</p>

            <div className="widget" style={{background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)', marginBottom: '2rem'}}>
                <h3>Your Preferences</h3>
                <p style={{color: 'var(--muted-foreground)'}}>Help us recommend art you'll love by telling us what you like. Separate multiple items with a comma.</p>

                <div style={{ marginTop: '1.5rem' }}>
                    <label style={{display: 'block', marginBottom: '0.5rem'}}>Preferred Mediums</label>
                    <input
                        type="text"
                        placeholder="e.g., Oil on canvas, Photography, Bronze sculpture"
                        value={preferredMediums}
                        onChange={(e) => setPreferredMediums(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem' }}
                    />
                </div>
                <div style={{ marginTop: '1.5rem' }}>
                    <label style={{display: 'block', marginBottom: '0.5rem'}}>Preferred Styles / Genres</label>
                    <input
                        type="text"
                        placeholder="e.g., Abstract, Portraiture, Impressionism"
                        value={preferredStyles}
                        onChange={(e) => setPreferredStyles(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem' }}
                    />
                </div>
                <button onClick={handleSave} disabled={mutation.isPending} style={{ marginTop: '1.5rem' }}>
                    {mutation.isPending ? 'Saving...' : 'Save Preferences'}
                </button>
            </div>

            <div className="widget" style={{background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)'}}>
                <h3>What We've Learned About You</h3>
                <p style={{color: 'var(--muted-foreground)'}}>Based on your activity, we think you're interested in:</p>
                {preferences?.learned_preferences ? (
                     <ul>
                        {Object.entries(preferences.learned_preferences).map(([key, value]) => (
                            <li key={key}>{`${key}: ${JSON.stringify(value)}`}</li>
                        ))}
                     </ul>
                ) : (
                    <p style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>No learned preferences to show yet. Start exploring the platform!</p>
                )}
            </div>
        </div>
    );
};
export default CollectorSettingsPage;