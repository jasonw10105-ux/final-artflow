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

export default CollectorSettingsPage;```

### 9. `src/pages/ForgotPasswordPage.tsx` (Complete File)

```typescript
// src/pages/ForgotPasswordPage.tsx

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Link } from 'react-router-dom';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`,
        });
        if (error) {
            setMessage(`Error: ${error.message}`);
        } else {
            setMessage('Check your email for a password reset link.');
        }
        setLoading(false);
    };

    return (
        <div className="gradient-polish" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <div className="widget" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
                <h2 style={{ textAlign: 'center' }}>Forgot Password</h2>
                <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', marginBottom: '2rem' }}>
                    We'll send a password reset link to your email.
                </p>
                <form onSubmit={handlePasswordReset}>
                    <input
                        className="input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                    />
                    <button className="button button-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>
                {message && <p style={{ marginTop: '1rem', textAlign: 'center' }}>{message}</p>}
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <Link to="/login">Back to Login</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;