// src/pages/ForgotPasswordPage.tsx

import React, { useState } from 'react'; // THIS LINE IS THE FIX
import { supabase } from '@/lib/supabaseClient';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading('Sending reset link...');

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`,
        });

        if (error) {
            toast.error(error.message, { id: toastId });
        } else {
            toast.success('Check your email for a password reset link.', { id: toastId });
        }

        setLoading(false);
    };

    return (
        <div className="auth-layout">
            <aside className="auth-promo-panel">
                <h1 className="auth-promo-title">Can't Remember? No Problem.</h1>
                <p className="auth-promo-subtitle">Enter your email to receive a secure link to reset your password and regain access to your Artflow account.</p>
            </aside>

            <main className="auth-form-panel">
                <div className="auth-card">
                    <header className="auth-card-header">
                        <Link to="/" className="logo-holder">
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
                            className="primary"
                        >
                            Send Reset Link
                        </Button>
                    </form>

                    <div className="auth-card-footer">
                        <Link to="/login">Back to Login</Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ForgotPasswordPage;