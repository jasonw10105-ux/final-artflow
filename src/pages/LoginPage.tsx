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
        <div class="gradient-polish">
            <div className="card">
            <div className="logo-holder">
                            <img src="../logo.svg" alt="Artflow" height="60px" />
                        </div>
            <h2>Welcome back</h2>
            <p>Sign in to your account</p>
            <form onSubmit={handleLogin}>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required/>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required/>
                <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
            </form>
            {error && <p style={{ color: 'red', marginTop: '1rem', textAlign: 'center' }}>{error}</p>}
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <Link to="/forgot-password">Forgot your password?</Link>
            </div>
        </div>
            <div style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                Don't have an account? <Link to="/register">Register here</Link>
            </div>
        </div>
    );
};
export default LoginPage;
