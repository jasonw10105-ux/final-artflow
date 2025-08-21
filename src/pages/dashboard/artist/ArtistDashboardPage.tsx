import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthProvider';
import AnalyticsChart from '../../../components/dashboard/AnalyticsChart';
import RecentActivityWidget from '../../../components/dashboard/RecentActivityWidget';

const ArtistDashboardPage = () => {
    const { profile } = useAuth();

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Dashboard</h1>
                <Link to={`/${profile?.slug}`} className="button button-secondary" target="_blank">View Public Profile</Link>
            </div>
            <p style={{ color: 'var(--muted-foreground)', marginTop: '-1rem', marginBottom: '2rem' }}>Welcome back, {profile?.full_name}!</p>
            
            <div style={{ background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Global Insights</h3>
                <AnalyticsChart />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                 <RecentActivityWidget />
            </div>
        </div>
    );
};
export default ArtistDashboardPage;
