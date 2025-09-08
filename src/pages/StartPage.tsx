import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Eye, EyeOff } from 'lucide-react';
import Button from '../components/ui/Button'; // Import your Button component
import toast from 'react-hot-toast'; // Assuming react-hot-toast for notifications

// Reusable Google Icon SVG
const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        <path fill="none" d="M1 1h22v22H1z" />
    </svg>
);

const StartPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [showPasswordInput, setShowPasswordInput] = useState(false); // Controls password field visibility
    const [verificationSent, setVerificationSent] = useState(false); // To show message for magic link

    const validateEmail = (inputEmail: string) => {
        if (!inputEmail) return "Email is required.";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(inputEmail)) return "Please enter a valid email address.";
        return null;
    };

    const handleEmailContinue = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setVerificationSent(false);
        setShowPasswordInput(false); // Reset password input state

        const validationMessage = validateEmail(email);
        if (validationMessage) {
            setEmailError(validationMessage);
            return;
        } else {
            setEmailError(null);
        }

        setLoading(true);
        try {
            // First, attempt to sign in or sign up with OTP (magic link)
            const { error: otpError } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/u/dashboard`
                },
            });

            if (otpError) {
                // Common error for users with a password when OTP is forbidden/blacklisted
                if (otpError.message.includes('Email link is forbidden for this user') || 
                    otpError.message.includes('AuthApiError: Email sign in is disabled')) { 
                    setShowPasswordInput(true);
                    setError("This email is registered and requires a password to log in.");
                } else if (otpError.message.includes('User already registered')) {
                     // This could indicate a user signed up via social and has no password,
                     // or the above error didn't explicitly fire. We still want to send a magic link
                     // as per the magic link flow for passwordless accounts.
                    setVerificationSent(true);
                    toast.success('Check your email for the magic link to continue!', { duration: 6000 });
                }
                else {
                    setError(otpError.message);
                }
            } else {
                // Magic link sent successfully (for new user or existing passwordless user)
                setVerificationSent(true);
                toast.success('Check your email for the magic link to continue!', { duration: 6000 });
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) {
            setError(loginError.message);
        } else {
            navigate('/u/dashboard', { replace: true });
        }
        setLoading(false);
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError(null);
        const { error: googleError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/u/dashboard`
            }
        });
        if (googleError) {
            setError(googleError.message);
            setLoading(false);
        }
        // If no error, navigation will be handled by the redirectTo URL.
    };

    const handleBackToEmailInput = () => {
        setEmail('');
        setPassword('');
        setError(null);
        setEmailError(null);
        setShowPasswordInput(false);
        setVerificationSent(false);
        setLoading(false);
    };

    return (
        <div className="auth-layout">
            <aside className="auth-promo-panel">
                <Link to="/">
                    <img src="/logo.svg" alt="Artflow" height="50px" />
                </Link>
                <h1 className="auth-promo-title">Discover, Manage, and Sell Your Art.</h1>
                <p className="auth-promo-subtitle">The ultimate platform for artists to build their careers and for collectors to discover their next acquisition.</p>
            </aside>
            <main className="auth-form-panel">
                <div className="auth-card">
                    <header className="auth-card-header">
                        <h2>Sign up or log in</h2>
                        <p>Continue with Google, or enter your email.</p>
                    </header>

                    <div className="auth-form" style={{gap: '1rem', marginBottom: '1.5rem'}}>
                        <Button
                            onClick={handleGoogleSignIn}
                            variant="secondary"
                            isLoading={loading}
                            className="google-button"
                            disabled={loading}
                        >
                            <GoogleIcon /> Continue with Google
                        </Button>
                    </div>

                    <div style={{textAlign: 'center', color: 'var(--muted-foreground)', margin: '1.5rem 0', textTransform: 'uppercase', fontSize: '0.8rem'}}>Or</div>

                    {!showPasswordInput && !verificationSent ? (
                        <form onSubmit={handleEmailContinue} className="auth-form">
                            <div className="form-group">
                                <label htmlFor="email-input" className="sr-only">Email</label>
                                <input
                                    id="email-input"
                                    className={`input ${emailError ? 'input-error' : ''}`}
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (emailError) setEmailError(null);
                                    }}
                                    onBlur={() => setEmailError(validateEmail(email))}
                                    placeholder="Email"
                                    required
                                    disabled={loading}
                                    aria-invalid={emailError ? "true" : "false"}
                                    aria-describedby={emailError ? "email-error-message" : undefined}
                                />
                                {emailError && <p id="email-error-message" className="error-message" role="alert">{emailError}</p>}
                            </div>
                            <Button type="submit" variant="primary" isLoading={loading} disabled={loading}>
                                {loading ? 'Checking email...' : 'Continue with Email'}
                            </Button>
                        </form>
                    ) : showPasswordInput && !verificationSent ? (
                        <form onSubmit={handlePasswordLogin} className="auth-form">
                            <p className="text-muted-foreground mb-4">Welcome back! Please enter your password for {email}.</p>
                             <div className="form-group" style={{ position: 'relative', width: '100%' }}>
                                <label htmlFor="password-login" className="sr-only">Password</label>
                                <input
                                    id="password-login"
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
                            <Button type="submit" variant="primary" isLoading={loading} disabled={loading}>
                                {loading ? 'Logging in...' : 'Login'}
                            </Button>
                            <Link to="/forgot-password" className="text-sm mt-2 block text-center">Forgot your password?</Link>
                            <button type="button" onClick={handleBackToEmailInput} className="button-link mt-4">Try a different email</button>
                        </form>
                    ) : verificationSent ? (
                        <div className="auth-form text-center">
                            <p className="text-lg font-semibold text-primary">Magic Link Sent!</p>
                            <p className="text-muted-foreground">Please check your email ({email}) to continue.</p>
                            <button type="button" onClick={handleBackToEmailInput} className="button-link mt-4">Back to start</button>
                        </div>
                    ) : null}

                    {error && <p className="error-message" role="alert">{error}</p>}
                    
                    {/* Only show "Need help?" if not in password mode or verification sent */}
                    {!showPasswordInput && !verificationSent && (
                        <div className="auth-switch-link mt-4">
                            Need help? <Link to="/support">Contact Support</Link>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StartPage;