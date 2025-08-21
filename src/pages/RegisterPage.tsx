import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
const RegisterPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) setMessage(`Error: ${error.message}`);
        else setMessage('Check your email for the magic link to continue!');
        setLoading(false);
    };
    
    return (
        <div class="gradient-polish" style={{ maxWidth: '400px', margin: '5rem auto', padding: '2rem', background: 'var(--card)', borderRadius: 'var(--radius)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Create Your Account</h2>
            <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', marginBottom: '2rem' }}>Start by entering your email. We'll send you a secure link to continue.</p>
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required/>
                <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Sending...' : 'Continue with Email'}</button>
            </form>
            {message && <p style={{ marginTop: '1rem', textAlign: 'center' }}>{message}</p>}
             <div style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                Already have an account? <Link to="/login">Login here</Link>
            </div>
        </div>
    );
};
export default RegisterPage;
