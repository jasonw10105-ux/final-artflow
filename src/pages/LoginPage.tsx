// src/pages/LoginPage.tsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Eye, EyeOff } from 'lucide-react'; // IMPROVEMENT: Import icons for password toggle

// IMPROVEMENT: Added a simple, inline SVG for the Google icon to avoid new dependencies.
const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        <path fill="none" d="M1 1h22v22H1z" />
    </svg>
);

const LoginPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // IMPROVEMENT: State to manage password visibility
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setError(error.message);
        } else {
            navigate('/dashboard', { replace: true });
        }
        setLoading(false); 
    };

    // IMPROVEMENT: Handler for Google SSO login
    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/dashboard`
            }
        });
        if (error) {
            setError(error.message);
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

                    {/* IMPROVEMENT: Added Google SSO Button */}
                    <div className="auth-form" style={{gap: '1rem', marginBottom: '1.5rem'}}>
                        <button onClick={handleGoogleSignIn} className="button button-secondary" style={{display: 'flex', gap: '0.75rem', width: '100%'}} disabled={loading}>
                            <GoogleIcon /> Continue with Google
                        </button>
                    </div>

                    <div style={{textAlign: 'center', color: 'var(--muted-foreground)', margin: '1.5rem 0', textTransform: 'uppercase', fontSize: '0.8rem'}}>Or</div>

                    <form onSubmit={handleLogin} className="auth-form">
                        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required disabled={loading} />
                        
                        {/* IMPROVEMENT: Password input with visibility toggle */}
                        <div style={{ position: 'relative', width: '100%' }}>
                            <input 
                                className="input" 
                                type={isPasswordVisible ? 'text' : 'password'} 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                placeholder="Password" 
                                required 
                                disabled={loading}
                                style={{ paddingRight: '2.5rem' }}
                            />
                            <button
                                type="button"
                                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)'}}
                                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                            >
                                {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
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