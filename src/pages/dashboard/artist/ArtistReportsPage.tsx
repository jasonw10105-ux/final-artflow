// src/pages/dashboard/artist/ArtistReportsPage.tsx
import React from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { FileText, Newspaper, Package } from 'lucide-react';
import '@/styles/app.css';

const ArtistReportsPage = () => {
    const { user, profile } = useAuth();

    const generateInventoryReport = async () => {
        toast.loading("Generating inventory report...");
        // In a real app, this would be a call to an edge function
        // that generates a PDF/CSV and returns a URL.
        // For now, we simulate the process.
        setTimeout(() => {
            toast.dismiss();
            toast.success("Inventory report generated (simulated).");
        }, 2000);
    };

    const generatePressKit = async () => {
        toast.loading("Generating press kit...");
        setTimeout(() => {
            toast.dismiss();
            toast.success("Press kit generated (simulated).");
        }, 2000);
    };

    return (
        <div className="page-container">
            <h1>Documents & Reports</h1>
            <p className="page-subtitle">Generate professional documents and reports for your art business.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                <div className="report-card">
                    <Package size={36} className="text-primary" />
                    <h3 className="text-xl font-semibold mt-4">Inventory Report</h3>
                    <p className="text-muted-foreground mt-2">Generate a complete CSV or PDF of all your artworks, including titles, dimensions, prices, and status. Perfect for insurance or personal records.</p>
                    <button onClick={generateInventoryReport} className="button button-primary mt-4">Generate Report</button>
                </div>
                <div className="report-card">
                    <Newspaper size={36} className="text-primary" />
                    <h3 className="text-xl font-semibold mt-4">Press Kit</h3>
                    <p className="text-muted-foreground mt-2">Automatically generate a professional press kit including your bio, artist statement, and a selection of your recent works. Ideal for gallery applications and media inquiries.</p>
                    <button onClick={generatePressKit} className="button button-primary mt-4">Generate Press Kit</button>
                </div>
            </div>
        </div>
    );
};

export default ArtistReportsPage;