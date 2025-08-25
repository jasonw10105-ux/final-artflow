// src/pages/ForgotPasswordPage.tsx
import React, inport { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button'; // Import our reusable Button

// Note: No need to import styles as they are now global in index.css

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`,
        });

        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Check your email for a password reset link.');
        }

        setLoading(false);
    };

    return (
        <div className="auth-layout">
            {/* The promo panel is optional, but we include it for consistency */}
            <aside className="auth-promo-panel">
                <h1 className="auth-promo-title">Can't Remember? No Problem.</h1>
                <p className="auth-promo-subtitle">Enter your email to receive a secure link to reset your password and regain access to your Artflow account.</p>
            </aside>

            <main className="auth-form-panel">
                <div className="auth-card">
                    <header className="auth-card-header">
                        <Link to="/home" className="logo-holder">
                            <img src="/logo.svg" alt="Artflow" height="50px" />
                        </Link>
                        <h2>Forgot Password</h2>
                        <p>Enter your email below to continue.</p>
                    </header>

                    <form onSubmit={handlePasswordReset} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="email" className="label">Email Address</label>
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
                        
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={loading}
                            className="primary" // Add variant class for styling
                        >
                            Send Reset Link
                        </Button>
                    </form>

                    <div className="auth-switch-link">
                        <Link to="/login">Back to Login</Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ForgotPasswordPage;