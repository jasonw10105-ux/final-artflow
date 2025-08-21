import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
const LoginPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
        else navigate('/dashboard');
        setLoading(false);
    };

    return (
        <div class="gradient-polish" style={{ maxWidth: '400px', margin: '5rem auto', padding: '2rem', background: 'var(--card)', borderRadius: 'var(--radius)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Login to Your Account</h2>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required/>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required/>
                <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
            </form>
            {error && <p style={{ color: 'red', marginTop: '1rem', textAlign: 'center' }}>{error}</p>}
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <Link to="/forgot-password">Forgot your password?</Link>
            </div>
            <div style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                Don't have an account? <Link to="/register">Register here</Link>
            </div>
        </div>
    );
};
export default LoginPage;
