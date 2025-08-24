// src/pages/RegisterPage.tsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button'; // Import our new Button
import styles from '@/styles/AuthPage.module.css'; // Import the shared CSS Module

const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // This is your original, correct magic link logic.
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                // This is where the user will be redirected after clicking the magic link.
                // The DashboardRedirector will then handle sending them to the right place.
                emailRedirectTo: `${window.location.origin}/dashboard`
            },
        });

        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Check your email for the magic link to continue!', {
                duration: 6000, // Give the user more time to read this message
            });
            // We keep the user on the page to see the success message.
        }
        
        setLoading(false);
    };
    
    return (
        <div className={styles.authLayout}>
            <aside className={styles.promoPanel}>
                <h1 className={styles.promoTitle}>Begin Your Journey on Artflow.</h1>
                <p className={styles.promoSubtitle}>Join a community of passionate artists and collectors. Create your portfolio, showcase your work, and connect with a global audience.</p>
            </aside>
            
            <main className={styles.formPanel}>
                 <div className={styles.authCard}>
                    <header className={styles.cardHeader}>
                         <Link to="/home" className={styles.logoHolder}>
                            <img src="/logo.svg" alt="Artflow" height="50px" />
                        </Link>
                        <h2>Create Your Account</h2>
                        <p>Enter your email to receive a secure magic link to get started.</p>
                    </header>

                    <form onSubmit={handleRegister} className={styles.authForm}>
                        <input 
                            className="input" 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            placeholder="you@example.com" 
                            required
                            disabled={loading}
                        />
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={loading}
                        >
                            Continue with Email
                        </Button>
                    </form>

                    <div className={styles.switchLink}>
                        Already have an account? <Link to="/login">Login here</Link>
                    </div>
                 </div>
            </main>
        </div>
    );
};

export default RegisterPage;