// src/pages/LoginPage.tsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const LoginPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading,setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            // The DashboardRedirector component in App.tsx will handle sending them
            // to the correct page (/artist/dashboard or /collector/dashboard).
            navigate('/dashboard');
            // FIX: The loading state was not being reset on a successful login.
            // Although navigation occurs, it's crucial to reset the state
            // in case the component doesn't unmount immediately.
            setLoading(false); 
        }
    };

    return (
        <div className="auth-layout">
            <aside className="auth-promo-panel">
                <h1 className="auth-promo-title">Discover, Manage, and Sell Your Art.</h1>
                <p className="auth-promo-subtitle">The ultimate platform for artists to build their careers and for collectors to discover their next acquisition.</p>
            </aside>
            <main className="auth-form-panel">
                <div className="auth-card">
                    <header className="auth-card-header">
                        <Link to="/home" className="logo-holder">
                            <img src="/logo.svg" alt="Artflow" height="50px" />
                        </Link>
                        <h2>Welcome Back</h2>
                        <p>Sign in to continue to your dashboard.</p>
                    </header>
                    <form onSubmit={handleLogin} className="auth-form">
                        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
                        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
                        <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
                    </form>
                    {error && <p className="error-message">{error}</p>}
                    <footer className="auth-card-footer">
                        <Link to="/forgot-password">Forgot your password?</Link>
                    </footer>
                    <div className="auth-switch-link">
                        Don't have an account? <Link to="/register">Register here</Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LoginPage;