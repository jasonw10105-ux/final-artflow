// src/pages/dashboard/collector/CollectorSettingsPage.tsx

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';

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
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },
        enabled: !!user,
    });

    useEffect(() => {
        if (preferences) {
            setPreferredMediums((preferences.preferred_mediums || []).join(', '));
            setPreferredStyles((preferences.preferred_styles || []).join(', '));
        }
    }, [preferences]);

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
                <div style={{ marginTop: '1.5rem' }}>
                    <label>Preferred Mediums</label>
                    <input
                        type="text"
                        value={preferredMediums}
                        onChange={(e) => setPreferredMediums(e.target.value)}
                        className="input"
                    />
                </div>
                <div style={{ marginTop: '1.5rem' }}>
                    <label>Preferred Styles / Genres</label>
                    <input
                        type="text"
                        value={preferredStyles}
                        onChange={(e) => setPreferredStyles(e.target.value)}
                         className="input"
                    />
                </div>
                <button onClick={handleSave} disabled={mutation.isPending} className="button button-primary">
                    {mutation.isPending ? 'Saving...' : 'Save Preferences'}
                </button>
            </div>

            <div className="widget" style={{background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)'}}>
                <h3>What We've Learned About You</h3>
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
        </div>
    );
};

export default CollectorSettingsPage;