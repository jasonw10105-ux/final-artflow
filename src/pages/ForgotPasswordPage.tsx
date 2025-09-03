// src/pages/ForgotPasswordPage.tsx

import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient'; // Updated path
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button'; // Import the new Button component

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null); // State for email validation error

    const validateEmail = (inputEmail: string) => {
        if (!inputEmail) return "Email is required.";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(inputEmail)) return "Please enter a valid email address.";
        return null;
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailError(null); // Clear previous client-side errors

        const validationMessage = validateEmail(email);
        if (validationMessage) {
            setEmailError(validationMessage);
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Sending reset link...');

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`,
        });

        if (error) {
            toast.error(error.message, { id: toastId });
            // Optionally, you could set an emailError here if the server error relates to the email format/existence
        } else {
            toast.success('Check your email for a password reset link.', { id: toastId });
            setEmail(''); // Clear email input on successful send
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
                        <Link to="/" className="logo-holder"> {/* Link to root path */}
                            <img src="/logo.svg" alt="Artflow" height="50px" />
                        </Link>
                        <h2>Forgot Password</h2>
                        <p>Enter your email below to continue.</p>
                    </header>

                    <form onSubmit={handlePasswordReset} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="email-reset" className="label">Email Address</label>
                            <input
                                id="email-reset"
                                className={`input ${emailError ? 'input-error' : ''}`} // Add error class
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (emailError) setEmailError(null); // Clear error on change
                                }}
                                onBlur={() => setEmailError(validateEmail(email))} // Validate on blur
                                placeholder="you@example.com"
                                required
                                disabled={loading}
                                aria-invalid={emailError ? "true" : "false"}
                                aria-describedby={emailError ? "email-reset-error-message" : undefined}
                            />
                            {emailError && <p id="email-reset-error-message" className="error-message" role="alert">{emailError}</p>} {/* Display error with role="alert" */}
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={loading}
                            disabled={loading} // Disabled prop already handled by Button internally with isLoading, but explicit is fine.
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