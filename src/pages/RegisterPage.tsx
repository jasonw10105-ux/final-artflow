// src/pages/RegisterPage.tsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';

// IMPROVEMENT: Added a simple, inline SVG for the Google icon.
const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        <path fill="none" d="M1 1h22v22H1z" />
    </svg>
);

const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/dashboard`
            },
        });
        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Check your email for the magic link to continue!', { duration: 6000 });
        }
        setLoading(false);
    };

    // IMPROVEMENT: Handler for Google SSO registration
    const handleGoogleSignIn = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/dashboard`
            }
        });
        if (error) {
            toast.error(error.message);
            setLoading(false);
        }
    };
    
    return (
        <div className="auth-layout">
            <aside className="auth-promo-panel">
                <h1 className="auth-promo-title">Begin Your Journey on Artflow.</h1>
                <p className="auth-promo-subtitle">Join a community of passionate artists and collectors. Create your portfolio, showcase your work, and connect with a global audience.</p>
            </aside>
            <main className="auth-form-panel">
                 <div className="auth-card">
                    <header className="auth-card-header">
                         <Link to="/home" className="logo-holder">
                            <img src="/logo.svg" alt="Artflow" height="50px" />
                        </Link>
                        <h2>Create Your Account</h2>
                        <p>Join using a provider below or with a secure magic link.</p>
                    </header>

                    {/* IMPROVEMENT: Added Google SSO Button */}
                    <div className="auth-form" style={{gap: '1rem', marginBottom: '1.5rem'}}>
                        <button onClick={handleGoogleSignIn} className="button button-secondary" style={{display: 'flex', gap: '0.75rem', width: '100%'}} disabled={loading}>
                           <GoogleIcon /> Continue with Google
                        </button>
                    </div>

                    <div style={{textAlign: 'center', color: 'var(--muted-foreground)', margin: '1.5rem 0', textTransform: 'uppercase', fontSize: '0.8rem'}}>Or</div>

                    <form onSubmit={handleRegister} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="email" className="label visually-hidden">Email Address</label>
                            <input
                                id="email"
                                className="input" 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                placeholder="you@example.com" 
                                required
                                disabled={loading}
                            />
                        </div>
                        <button className="button button-primary" type="submit" disabled={loading}>
                            {loading ? 'Sending link...' : 'Continue with Email'}
                        </button>
                    </form>

                    <div className="auth-card-footer" style={{marginTop: '1.5rem'}}>
                        Already have an account? <Link to="/login">Login here</Link>
                    </div>
                 </div>
            </main>
        </div>
    );
};

export default RegisterPage;