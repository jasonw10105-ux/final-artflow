import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthProvider';
import AnalyticsChart from '../../../components/dashboard/AnalyticsChart'; // Assuming this component exists
import RecentActivityWidget from '../../../components/dashboard/RecentActivityWidget'; // Assuming this component exists
import { PlusCircle, LibraryBig, GalleryVertical, PenLine } from 'lucide-react';
import ArtworkUploadModal from '../../../components/dashboard/ArtworkUploadModal'; // Assuming this component exists
import { useArtworkUploadStore } from '../../../stores/artworkUploadStore'; // Assuming this store exists
import { supabase } from '../../../lib/supabaseClient';
import '@/styles/app.css'; // Import the centralized styles
import toast from 'react-hot-toast';

// --- Data Fetching for Dashboard Stats ---
const fetchDashboardStats = async (userId: string) => {
    const { data: artworkCountData, error: artworkCountError } = await supabase
        .from('artworks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
    if (artworkCountError) throw artworkCountError;

    const { data: catalogueCountData, error: catalogueCountError } = await supabase
        .from('catalogues')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
    if (catalogueCountError) throw catalogueCountError;

    const { data: unreadMessagesData, error: unreadMessagesError } = await supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', userId)
        .eq('artist_unread', true);
    if (unreadMessagesError) throw unreadMessagesError;

    return {
        artworkCount: artworkCountData.count || 0,
        catalogueCount: catalogueCountData.count || 0,
        unreadMessagesCount: unreadMessagesData.count || 0,
    };
};

const ArtistDashboardPage = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // State and refs for upload functionality
    const [showUploadModal, setShowUploadModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addFiles, clearStore } = useArtworkUploadStore();

    // Fetch dashboard stats
    const { data: stats, isLoading: isLoadingStats } = useQuery({
        queryKey: ['dashboardStats', user?.id],
        queryFn: () => fetchDashboardStats(user!.id),
        enabled: !!user,
        staleTime: 1000 * 60, // Data is fresh for 1 minute
    });

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            addFiles(Array.from(event.target.files));
            setShowUploadModal(true);
            // Reset the input value to allow selecting the same file again
            if (event.target) event.target.value = '';
        }
    };

    const handleUploadComplete = (artworkIds: string[]) => {
        setShowUploadModal(false);
        clearStore();
        // Invalidate artworks query so the list page is fresh when the user navigates there
        queryClient.invalidateQueries({ queryKey: ['artworks', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats', user?.id] }); // Update stats
        navigate(`/u/artworks/wizard?ids=${artworkIds.join(',')}`);
    };

    // --- Personalized Action Prompts / AI-Driven "To-Do" List ---
    const todoList = useMemo(() => {
        const tasks = [];
        if (stats) {
            if (stats.artworkCount < 5) {
                tasks.push({
                    id: 'create-artwork',
                    text: 'You have less than 5 artworks. Upload more to showcase your collection!',
                    action: () => fileInputRef.current?.click(),
                    actionText: 'Upload Artwork',
                    icon: <PlusCircle size={16} />,
                });
            }
            if (stats.catalogueCount < 3) {
                tasks.push({
                    id: 'create-catalogue',
                    text: 'Create your first catalogue to share curated selections with collectors.',
                    action: () => navigate('/u/catalogues/new'),
                    actionText: 'Create Catalogue',
                    icon: <LibraryBig size={16} />,
                });
            }
            if (stats.unreadMessagesCount > 0) {
                tasks.push({
                    id: 'check-messages',
                    text: `You have ${stats.unreadMessagesCount} unread messages. Respond to inquiries promptly!`,
                    action: () => navigate('/u/messages'),
                    actionText: 'View Messages',
                    icon: <GalleryVertical size={16} />,
                });
            }
        }
        // Placeholder for AI-driven suggestions (e.g., "Artwork 'Sunset Bliss' is trending, consider promoting it!")
        // Or "Your profile bio is short, consider adding more details."
        tasks.push({
            id: 'complete-profile',
            text: 'Ensure your artist statement and bio are complete for a compelling profile.',
            action: () => navigate('/u/settings'),
            actionText: 'Update Profile',
            icon: <PenLine size={16} />,
        });
        return tasks;
    }, [stats, navigate]);

    // Split button state
    const [showCreateMenu, setShowCreateMenu] = useState(false);
    const createButtonRef = useRef<HTMLButtonElement>(null);

    const handleCreateMenuToggle = () => {
        setShowCreateMenu((prev) => !prev);
    };

    const handleClickOutsideCreateMenu = (event: MouseEvent) => {
        if (createButtonRef.current && !createButtonRef.current.contains(event.target as Node)) {
            setShowCreateMenu(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutsideCreateMenu);
        return () => {
            document.removeEventListener('mousedown', handleClickOutsideCreateMenu);
        };
    }, []);

    return (
        <div className="page-container">
            {/* Render Modal */}
            {showUploadModal && <ArtworkUploadModal onUploadComplete={handleUploadComplete} />}
            {/* Hidden file input */}
            <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden-input" accept="image/*" />

            <div className="dashboard-header-row">
                <h1>Hi, {profile?.full_name}!</h1>
                <div className="dashboard-actions-group">
                    {profile?.slug && (
                        <Link to={`/${profile.slug}`} className="button button-secondary" target="_blank" rel="noopener noreferrer">View Public Profile</Link>
                    )}
                    <div className="relative">
                        <button
                            ref={createButtonRef}
                            onClick={handleCreateMenuToggle}
                            className="button button-primary split-button button-with-icon"
                        >
                            <PlusCircle size={16} /> Create New <span className="caret-down"></span>
                        </button>
                        {showCreateMenu && (
                            <div className="split-button-dropdown">
                                <button
                                    onClick={() => {
                                        fileInputRef.current?.click();
                                        setShowCreateMenu(false);
                                    }}
                                    className="dropdown-item"
                                >
                                    New Artwork
                                </button>
                                <button
                                    onClick={() => {
                                        navigate('/u/catalogues/new');
                                        setShowCreateMenu(false);
                                    }}
                                    className="dropdown-item"
                                >
                                    New Catalogue
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="dashboard-section">
                <h3 className="dashboard-section-title">Your To-Do List</h3>
                {isLoadingStats ? (
                    <p className="loading-message">Loading tasks...</p>
                ) : todoList.length > 0 ? (
                    <div className="todo-list-grid">
                        {todoList.map(task => (
                            <div key={task.id} className="todo-list-item">
                                <div className="todo-icon">{task.icon}</div>
                                <p className="todo-text">{task.text}</p>
                                <button onClick={task.action} className="button button-secondary button-sm">
                                    {task.actionText}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="empty-state-message">All caught up! Great job. Keep creating!</p>
                )}
            </div>

            <div className="dashboard-section">
                <h3 className="dashboard-section-title">Global Insights</h3>
                {/* AnalyticsChart is assumed to exist */}
                <AnalyticsChart />
            </div>

            <div className="dashboard-section">
                {/* RecentActivityWidget is assumed to exist */}
                <RecentActivityWidget />
            </div>
        </div>
    );
};
export default ArtistDashboardPage;