// src/pages/RegisterPage.tsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';

// NOTE: The import for 'AuthPage.module.css' has been removed.

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
            toast.success('Check your email for the magic link to continue!', {
                duration: 6000,
            });
        }
        
        setLoading(false);
    };
    
    return (
        // These class names now match the global index.css file
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
                        <p>Enter your email to receive a secure magic link to get started.</p>
                    </header>

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
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={loading}
                            className="primary"
                        >
                            Continue with Email
                        </Button>
                    </form>

                    <div className="auth-card-footer">
                        Already have an account? <Link to="/login">Login here</Link>
                    </div>
                 </div>
            </main>
        </div>
    );
};

export default RegisterPage;