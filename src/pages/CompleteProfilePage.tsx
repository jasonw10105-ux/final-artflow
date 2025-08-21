// src/pages/public/CompleteProfilePage.tsx

import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthProvider'

const CompleteProfilePage = () => {
    const { user } = useAuth();
    // --- FIXED: State split into first and last name ---
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleProfileComplete = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        // --- FIXED: Validation updated for first and last name ---
        if (!user || !role || !firstName || !lastName || password.length < 6) {
            setError("Please fill all fields. Password must be at least 6 characters.");
            return;
        }

        setLoading(true);

        // --- FIXED: Combine names for slug generation and full_name column ---
        const fullName = `${firstName} ${lastName}`.trim();

        const { data: slugData, error: slugError } = await supabase.rpc('generate_unique_slug', { input_text: fullName, table_name: 'profiles' });
        if (slugError) {
            setError("Could not create a unique profile URL. Please try again.");
            setLoading(false);
            return;
        }

        const { error: passwordError } = await supabase.auth.updateUser({ password });
        if (passwordError) {
            setError(passwordError.message);
            setLoading(false);
            return;
        }
        
        // --- FIXED: Profile data includes new first_name and last_name fields ---
        const profileUpdates = {
            id: user.id,
            first_name: firstName,
            last_name: lastName,
            full_name: fullName,
            role: role,
            profile_completed: true,
            slug: slugData,
            updated_at: new Date(),
        };

        const { error: profileError } = await supabase.from('profiles').upsert(profileUpdates);

        if (profileError) {
            setError(profileError.message);
        } else {
            // Use replace to prevent user from going back to this page
            window.location.replace('/dashboard'); 
        }
        setLoading(false);
    };

    return (
        <div class="gradient-polish" style={{ maxWidth: '500px', margin: '3rem auto', padding: '2rem', background: 'var(--card)', borderRadius: 'var(--radius)' }}>
            <h2 style={{ textAlign: 'center' }}>Complete Your Profile</h2>
            <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', marginBottom: '2rem' }}>Just a few more details to get you started.</p>
            <form onSubmit={handleProfileComplete}>
                <fieldset>
                    {/* --- FIXED: Replaced single name input with two --- */}
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                        <div>
                            <label>First Name</label>
                            <input className="input" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                        </div>
                        <div>
                            <label>Last Name</label>
                            <input className="input" type="text" value={lastName} onChange={e => setLastName(e.target.value)} required />
                        </div>
                    </div>

                    <label>Primary Role</label>
                    <select className="input" value={role} onChange={e => setRole(e.target.value)} required>
                        <option value="" disabled>-- Select a Role --</option>
                        <option value="artist">Artist</option>
                        <option value="collector">Collector</option>
                        <option value="both">Both Artist & Collector</option>
                    </select>

                    <label>Create a password for future logins</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                            className="input"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            style={{ paddingRight: '40px' }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.12 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z" /><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z" /></svg>
                        </button>
                    </div>

                    <label>Confirm Password</label>
                    <input className="input" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </fieldset>
                {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
                <button type="submit" className="button button-primary" style={{ width: '100%' }} disabled={loading}>
                    {loading ? 'Saving...' : 'Complete Registration'}
                </button>
            </form>
        </div>
    );
};
export default CompleteProfilePage;