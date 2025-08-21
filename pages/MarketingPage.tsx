import React from 'react';
import { Link } from 'react-router-dom';
const MarketingPage = () => (
    <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>The Studio OS</h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--muted-foreground)', marginBottom: '2rem' }}>Your all-in-one platform to manage, showcase, and sell your art.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <Link to="/register"><button className="button button-primary">Register Now</button></Link>
            <Link to="/login"><button className="button button-secondary">Login</button></Link>
        </div>
    </div>
);
export default MarketingPage;