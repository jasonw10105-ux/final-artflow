// src/components/dashboard/AnalyticsChart.tsx

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAnalytics } from '../../hooks/useAnalytics';

const AnalyticsChart = () => {
    const { data, isLoading } = useAnalytics();
    if (isLoading) return <p>Loading analytics...</p>;
    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                    <YAxis stroke="var(--muted-foreground)" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
                    <Legend />
                    {/* FIXED: The data key from the hook is 'count', not 'value' */}
                    <Bar dataKey="count" fill="var(--primary)" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
export default AnalyticsChart;