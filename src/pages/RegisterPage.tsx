import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';

const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setIsError(false);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: `${window.location.origin}/artist/dashboard` },
        });

        if (error) {
            setMessage(`Error: ${error.message}`);
            setIsError(true);
        } else {
            setMessage('Check your email for the magic link to continue!');
            setIsError(false);
        }
        setLoading(false);
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
                         <div className="logo-holder">
                            <img src="/logo.svg" alt="Artflow" height="50px" />
                        </div>
                        <h2>Create Your Account</h2>
                        <p>Enter your email to receive a secure magic link to get started.</p>
                    </header>

                    <form onSubmit={handleRegister} className="auth-form">
                        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required/>
                        <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Sending Link...' : 'Continue with Email'}</button>
                    </form>

                    {message && <p className={isError ? 'error-message' : 'success-message'}>{message}</p>}

                    <div className="auth-switch-link">
                        Already have an account? <Link to="/login">Login here</Link>
                    </div>
                 </div>
            </main>
        </div>
    );
};

export default RegisterPage;