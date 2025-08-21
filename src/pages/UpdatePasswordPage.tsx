import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
const UpdatePasswordPage = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') setMessage('Authenticated. You can now set a new password.');
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
        setLoading(true);
        setError('');
        const { error } = await supabase.auth.updateUser({ password });
        if (error) setError(`Error: ${error.message}`);
        else {
            setMessage('Password updated successfully! Redirecting...');
            setTimeout(() => navigate('/dashboard'), 2000);
        }
        setLoading(false);
    };
    return (
        <div class="gradient-polish" style={{ maxWidth: '400px', margin: '5rem auto', padding: '2rem', background: 'var(--card)', borderRadius: 'var(--radius)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Update Your Password</h2>
            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New Password" required/>
                <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</button>
            </form>
            {message && <p style={{ color: 'green', marginTop: '1rem', textAlign: 'center' }}>{message}</p>}
            {error && <p style={{ color: 'red', marginTop: '1rem', textAlign: 'center' }}>{error}</p>}
        </div>
    );
};
export default UpdatePasswordPage;
