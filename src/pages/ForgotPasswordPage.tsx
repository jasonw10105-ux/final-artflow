// src/pages/ForgotPasswordPage.tsx

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Link } from 'react--router-dom';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`,
        });

        setLoading(false);
        if (resetError) {
            setError(`Error: ${resetError.message}`);
        } else {
            setMessage('Check your email for a password reset link.');
        }
    };

    return (
        <div className="gradient-polish" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <div className="auth-card" style={{ maxWidth: '400px', width: '100%' }}>
                <header className="auth-card-header">
                    <Link to="/home" className="logo-holder">
                        <img src="/logo.svg" alt="Artflow" height="50px" />
                    </Link>
                    <h2>Reset Your Password</h2>
                    <p>Enter your email and we'll send you instructions to reset your password.</p>
                </header>

                <form onSubmit={handlePasswordReset} className="auth-form">
                    <input
                        id="email"
                        className="input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                    />
                    <button className="button button-primary" type="submit" disabled={loading}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                {message && <p className="success-message" style={{ textAlign: 'center' }}>{message}</p>}
                {error && <p className="error-message" style={{ textAlign: 'center' }}>{error}</p>}

                <footer className="auth-card-footer" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <Link to="/login">Remembered your password? Login</Link>
                </footer>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;```