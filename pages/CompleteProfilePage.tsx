import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthProvider';
const CompleteProfilePage = () => {
    const { user } = useAuth();
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleProfileComplete = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!user || !role || !fullName || password.length < 6) {
            setError("Please fill all fields. Password must be at least 6 characters.");
            return;
        }
        setLoading(true);

        const { data: slugData, error: slugError } = await supabase.rpc('generate_unique_slug', { input_text: fullName, table_name: 'profiles' });
        if (slugError) { setError("Could not create a unique profile URL. Please try again."); setLoading(false); return; }

        const { error: passwordError } = await supabase.auth.updateUser({ password });
        if (passwordError) { setError(passwordError.message); setLoading(false); return; }

        const profileUpdates = {
            id: user.id, full_name: fullName, role: role, profile_completed: true, slug: slugData, updated_at: new Date(),
        };
        const { error: profileError } = await supabase.from('profiles').upsert(profileUpdates);
        if (profileError) setError(profileError.message);
        else window.location.pathname = '/dashboard';
        setLoading(false);
    };

    return (
        <div style={{ maxWidth: '500px', margin: '3rem auto', padding: '2rem', background: 'var(--card)', borderRadius: 'var(--radius)' }}>
            <h2 style={{ textAlign: 'center' }}>Complete Your Profile</h2>
            <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', marginBottom: '2rem' }}>Just a few more details to get you started.</p>
            <form onSubmit={handleProfileComplete}>
                <fieldset>
                    <label>Full Name</label>
                    <input className="input" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required />
                    <label>Primary Role</label>
                    <select className="input" value={role} onChange={e => setRole(e.target.value)} required>
                        <option value="" disabled>-- Select a Role --</option>
                        <option value="artist">Artist</option>
                        <option value="collector">Collector</option>
                        <option value="both">Both Artist & Collector</option>
                    </select>
                    <label>Create a password for future logins</label>
                    <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </fieldset>
                {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
                <button type="submit" className="button button-primary" style={{width: '100%'}} disabled={loading}>{loading ? 'Saving...' : 'Complete Registration'}</button>
            </form>
        </div>
    );
};
export default CompleteProfilePage;