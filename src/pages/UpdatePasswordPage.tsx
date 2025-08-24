// src/pages/UpdatePasswordPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const UpdatePasswordPage = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setMessage('Authenticated. You can now set a new password.');
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        setLoading(true);
        setError('');
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
            setError(`Error: ${error.message}`);
        } else {
            setMessage('Password updated successfully! Redirecting...');
            setTimeout(() => navigate('/dashboard'), 2000);
        }
        setLoading(false);
    };
    
    return (
        <div className="gradient-polish" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <div className="widget" style={{ maxWidth: '400px', width: '100%', padding: '2rem' }}>
                <h2 style={{ textAlign: 'center' }}>Update Your Password</h2>
                <form onSubmit={handleUpdatePassword}>
                    <input
                        className="input"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="New Password"
                        required
                    />
                    <button className="button button-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
                        {loading ? 'Updating...' : 'Update Password'}
                    </button>
                </form>
                {message && <p style={{ color: 'green', marginTop: '1rem', textAlign: 'center' }}>{message}</p>}
                {error && <p style={{ color: 'red', marginTop: '1rem', textAlign: 'center' }}>{error}</p>}
            </div>
        </div>
    );
};

export default UpdatePasswordPage;