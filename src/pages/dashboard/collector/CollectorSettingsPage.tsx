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
    const [autoLearning, setAutoLearning] = useState(true);
    const [minBudget, setMinBudget] = useState('');
    const [maxBudget, setMaxBudget] = useState('');

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

            if (preferences.min_budget || preferences.max_budget) {
                setMinBudget(preferences.min_budget?.toString() || '');
                setMaxBudget(preferences.max_budget?.toString() || '');
            }
            // if manual budgets exist, default to autoLearning = false
            if (preferences.min_budget !== null || preferences.max_budget !== null) {
                setAutoLearning(false);
            }
        }
    }, [preferences]);

    const mutation = useMutation({
        mutationFn: async (updatedPrefs: {
            preferred_mediums: string[],
            preferred_styles: string[],
            min_budget: number | null,
            max_budget: number | null,
        }) => {
            if (!user) throw new Error("User not found");
            const { data, error } = await supabase
                .from('user_preferences')
                .upsert({
                    user_id: user.id,
                    ...updatedPrefs,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' })
                .select()
                .single();
            
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

        mutation.mutate({
            preferred_mediums: mediums,
            preferred_styles: styles,
            min_budget: autoLearning ? null : (minBudget ? Number(minBudget) : null),
            max_budget: autoLearning ? null : (maxBudget ? Number(maxBudget) : null),
        });
    };

    if (isLoading) return <p>Loading settings...</p>;

    return (
        <div>
            <h1>Collector Settings</h1>
            <p style={{ color: 'var(--muted-foreground)', marginTop: '-0.5rem', marginBottom: '2rem' }}>
                Manage your preferences to get better recommendations.
            </p>

            {/* Preferences */}
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
            </div>

            {/* Budget settings */}
            <div className="widget" style={{background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)', marginBottom: '2rem'}}>
                <h3>Artwork Budget</h3>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input
                        type="checkbox"
                        checked={autoLearning}
                        onChange={(e) => setAutoLearning(e.target.checked)}
                    />
                    Let the system learn my budget
                </label>

                {autoLearning ? (
                    <div style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                        {preferences?.learned_preferences?.budget_range
                            ? <p>Learned budget range: {preferences.learned_preferences.budget_range[0]} – {preferences.learned_preferences.budget_range[1]}</p>
                            : <p>No learned budget yet — keep browsing and buying for the system to learn.</p>}
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div>
                            <label>Min Budget</label>
                            <input
                                type="number"
                                value={minBudget}
                                onChange={(e) => setMinBudget(e.target.value)}
                                className="input"
                            />
                        </div>
                        <div>
                            <label>Max Budget</label>
                            <input
                                type="number"
                                value={maxBudget}
                                onChange={(e) => setMaxBudget(e.target.value)}
                                className="input"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Learned preferences */}
            <div className="widget" style={{background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)'}}>
                <h3>What We've Learned About You</h3>
                {preferences?.learned_preferences ? (
                     <ul>
                        {Object.entries(preferences.learned_preferences as object).map(([key, value]) => (
                            <li key={key}><strong>{key}</strong>: {JSON.stringify(value)}</li>
                        ))}
                     </ul>
                ) : (
                    <p>No learned preferences to show yet.</p>
                )}
            </div>

            {/* Save button */}
            <button 
                onClick={handleSave} 
                disabled={mutation.isPending} 
                className="button button-primary" 
                style={{ marginTop: '2rem' }}
            >
                {mutation.isPending ? 'Saving...' : 'Save Preferences'}
            </button>
        </div>
    );
};

export default CollectorSettingsPage;
