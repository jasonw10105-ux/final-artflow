// src/pages/dashboard/collector/CollectorSettingsPage.tsx

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';

const CollectorSettingsPage = () => {
    const { user } = useAuth();
    const [preferredMediums, setPreferredMediums] = useState<string[]>([]);
    const [preferredStyles, setPreferredStyles] = useState<string[]>([]);

    const { data: preferences, isLoading } = useQuery({
        queryKey: ['userPreferences', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).single();
            return data;
        },
        enabled: !!user,
        onSuccess: (data) => {
            if (data) {
                setPreferredMediums(data.preferred_mediums || []);
                setPreferredStyles(data.preferred_styles || []);
            }
        }
    });

    const updatePreferences = useMutation({
        mutationFn: async (updatedPrefs: { preferred_mediums: string[], preferred_styles: string[] }) => {
            if (!user) throw new Error("User not found");
            const { data, error } = await supabase.from('user_preferences').upsert({
                user_id: user.id,
                ...updatedPrefs
            }).select();
            if (error) throw error;
            return data;
        },
        // You can add onSuccess and onError handlers for feedback
    });

    const handleSave = () => {
        updatePreferences.mutate({ preferred_mediums: preferredMediums, preferred_styles: preferredStyles });
    };

    if (isLoading) return <p>Loading settings...</p>;

    return (
        <div>
            <h1>Collector Settings</h1>

            <div className="widget" style={{background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)', marginBottom: '2rem'}}>
                <h3>Your Preferences</h3>
                <p style={{color: 'var(--muted-foreground)'}}>Help us recommend art you'll love by telling us what you like.</p>

                <div style={{ marginTop: '1rem' }}>
                    <label>Preferred Mediums (comma-separated)</label>
                    <input
                        type="text"
                        value={preferredMediums.join(', ')}
                        onChange={(e) => setPreferredMediums(e.target.value.split(',').map(s => s.trim()))}
                        style={{ width: '100%', padding: '0.5rem' }}
                    />
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <label>Preferred Styles (e.g., Abstract, Portraiture)</label>
                    <input
                        type="text"
                        value={preferredStyles.join(', ')}
                        onChange={(e) => setPreferredStyles(e.target.value.split(',').map(s => s.trim()))}
                        style={{ width: '100%', padding: '0.5rem' }}
                    />
                </div>
                <button onClick={handleSave} style={{ marginTop: '1.5rem' }}>Save Preferences</button>
            </div>

            <div className="widget" style={{background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)'}}>
                <h3>What We've Learned About You</h3>
                <p style={{color: 'var(--muted-foreground)'}}>Based on your activity, we think you're interested in:</p>
                {/* In a real implementation, this would be populated from the `learned_preferences` field */}
                <ul>
                    <li>Contemporary Art</li>
                    <li>Oil Paintings</li>
                    <li>South African Artists</li>
                </ul>
                <p style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>This feature is still in development. Soon, you'll be able to refine these learned tastes.</p>
            </div>
        </div>
    );
};
export default CollectorSettingsPage;