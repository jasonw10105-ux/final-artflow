import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
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
        if (error) setMessage(`Error: ${error.message}`);
        else setMessage('Check your email for a password reset link.');
        setLoading(false);
    };

    return (
        <div style={{ maxWidth: '400px', margin: '5rem auto', padding: '2rem', background: 'var(--card)', borderRadius: 'var(--radius)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Forgot Password</h2>
            <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', marginBottom: '2rem' }}>Enter your email address and we'll send you a link to reset your password.</p>
            <form onSubmit={handlePasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required/>
                <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</button>
            </form>
            {message && <p style={{ marginTop: '1rem', textAlign: 'center' }}>{message}</p>}
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <Link to="/login">Back to Login</Link>
            </div>
        </div>
    );
};
export default ForgotPasswordPage;
