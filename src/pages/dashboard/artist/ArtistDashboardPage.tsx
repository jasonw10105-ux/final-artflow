import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthProvider';
import AnalyticsChart from '../../../components/dashboard/AnalyticsChart';
import RecentActivityWidget from '../../../components/dashboard/RecentActivityWidget';
import { PlusCircle } from 'lucide-react';
import ArtworkUploadModal from '../../../components/dashboard/ArtworkUploadModal';
import { useArtworkUploadStore } from '../../../stores/artworkUploadStore';

const ArtistDashboardPage = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    // State and refs for upload functionality
    const [showUploadModal, setShowUploadModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addFiles, clearStore } = useArtworkUploadStore();

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            addFiles(Array.from(event.target.files));
            setShowUploadModal(true);
            // Reset the input value to allow selecting the same file again
            if(event.target) event.target.value = '';
        }
    };

    const handleUploadComplete = (artworkIds: string[]) => {
        setShowUploadModal(false);
        clearStore();
        // Invalidate artworks query so the list page is fresh when the user navigates there
        queryClient.invalidateQueries({ queryKey: ['artworks', user?.id] });
        navigate(`/artist/artworks/wizard?ids=${artworkIds.join(',')}`);
    };

    return (
        <div>
            {/* Render Modal */}
            {showUploadModal && <ArtworkUploadModal onUploadComplete={handleUploadComplete} />}
            {/* Hidden file input */}
            <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="image/*" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h1>Dashboard</h1>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <Link to={`/${profile?.slug}`} className="button button-secondary" target="_blank">View Public Profile</Link>
                    <button onClick={() => fileInputRef.current?.click()} className="button button-primary" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <PlusCircle size={16} /> Create New Artwork
                    </button>
                </div>
            </div>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>Welcome back, {profile?.full_name}!</p>
            
            <div>
                <h3 style={{ marginBottom: '1rem' }}>Global Insights</h3>
                <AnalyticsChart />
            </div>

            <div>
                 <RecentActivityWidget />
            </div>
        </div>
    );
};
export default ArtistDashboardPage;
