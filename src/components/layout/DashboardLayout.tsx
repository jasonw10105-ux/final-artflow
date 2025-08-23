import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { LayoutDashboard, Palette, MessageSquare, Image, Settings, LogOut, BarChart3, Users, CreditCard, Menu, X } from 'lucide-react';

const DashboardLayout = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };
    
    const isArtist = profile?.role === 'artist' || profile?.role === 'both';
    
    const artistSidebarLinks = [
        { to: "/artist/dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
        { to: "/artist/artworks", icon: <Image size={18} />, label: "Artworks" },
        { to: "/artist/catalogues", icon: <Palette size={18} />, label: "Catalogues" },
        { to: "/artist/contacts", icon: <Users size={18} />, label: "Contacts" },
        { to: "/artist/messages", icon: <MessageSquare size={18} />, label: "Messages" },
        { to: "/artist/sales", icon: <CreditCard size={18} />, label: "Sales" },
        { to: "/artist/insights", icon: <BarChart3 size={18} />, label: "Insights" },
    ];
    
    const artistBottomNavLinks = [
        { to: "/artist/dashboard", icon: <LayoutDashboard size={22} />, label: "Home" },
        { to: "/artist/artworks", icon: <Image size={22} />, label: "Work" },
        { to: "/artist/catalogues", icon: <Palette size={18} />, label: "Catalogues" },
        { to: "/artist/sales", icon: <CreditCard size={22} />, label: "Sales" },
        { to: "/artist/messages", icon: <MessageSquare size={22} />, label: "Inbox" },
    ];

    const secondaryLinks = [
        { to: "/artist/settings", icon: <Settings size={18} />, label: "Settings" },
    ];

    const linkClasses = ({ isActive }: { isActive: boolean }) => `sidebar-link ${isActive ? 'active' : ''}`;
    const mobileLinkClasses = ({ isActive }: { isActive: boolean }) => `bottom-nav-link ${isActive ? 'active' : ''}`;
    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    return (
        <>
            {isArtist && (
                <header className="mobile-top-bar">
                    <Link to="/"><img src="/logo.svg" alt="Artflow" height="40px"/></Link>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="mobile-menu-button">
                        <Menu size={24} />
                    </button>
                </header>
            )}

            {isMobileMenuOpen && (
                <div className="mobile-menu-overlay" onClick={closeMobileMenu}>
                    <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                            <button onClick={closeMobileMenu} className="mobile-menu-button"><X size={24} /></button>
                        </div>
                        <nav className="sidebar-nav">
                            {artistSidebarLinks.map(link => (
                                <NavLink key={link.to} to={link.to} className={linkClasses} onClick={closeMobileMenu}>{link.icon} {link.label}</NavLink>
                            ))}
                        </nav>
                        <div>
                            {secondaryLinks.map(link => (
                                <NavLink key={link.to} to={link.to} className={linkClasses} onClick={closeMobileMenu}>{link.icon} {link.label}</NavLink>
                            ))}
                            <button onClick={handleLogout} className="sidebar-link sidebar-footer-link"><LogOut size={18} /> Logout</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="dashboard-grid">
                <aside className="dashboard-sidebar">
                    <Link to="/"><img src="/logo.svg" alt="Artflow" height="40px"/></Link>
                    <nav className="sidebar-nav">
                        {isArtist && artistSidebarLinks.map(link => (
                            <NavLink key={link.to} to={link.to} className={linkClasses}>{link.icon} {link.label}</NavLink>
                        ))}
                    </nav>
                    <div>
                         {secondaryLinks.map(link => (
                            <NavLink key={link.to} to={link.to} className={linkClasses}>{link.icon} {link.label}</NavLink>
                         ))}
                         <button onClick={handleLogout} className="sidebar-link sidebar-footer-link"><LogOut size={18} /> Logout</button>
                    </div>
                </aside>
                
                <main className="dashboard-main">
                    <Outlet />
                </main>
            </div>
            
            {isArtist && (
                <nav className="bottom-nav">
                    {artistBottomNavLinks.map(link => (
                        <NavLink key={link.to} to={link.to} className={mobileLinkClasses}>
                            {link.icon}
                            <span>{link.label}</span>
                        </NavLink>
                    ))}
                </nav>
            )}
        </>
    );
};

export default DashboardLayout;```

### `src/pages/dashboard/artist/ArtworkWizardPage.tsx`

```tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';
import ArtworkEditorForm from '../../../components/dashboard/ArtworkEditorForm';
import { ArrowLeft, ArrowRight, PlusCircle, Trash2 } from 'lucide-react';
import ArtworkUploadModal from '../../../components/dashboard/ArtworkUploadModal';
import { useArtworkUploadStore } from '../../../stores/artworkUploadStore';

// (fetchArtworksByIds function remains the same)
const fetchArtworksByIds = async (ids: string[]) => {
    if (!ids || ids.length === 0) return [];
    const { data, error } = await supabase.from('artworks').select('*').in('id', ids);
    if (error) throw new Error(error.message);
    const sortedData = ids.map(id => data.find(artwork => artwork.id === id)).filter(Boolean);
    return sortedData as any[];
};


const ArtworkWizardPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const artworkIds = useMemo(() => searchParams.get('ids')?.split(',') || [], [searchParams]);
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const { clearStore } = useArtworkUploadStore();
    const mainContentRef = useRef<HTMLElement>(null);
    
    const wizardQueryKey = ['artworks-wizard', artworkIds];

    const { data: artworks, isLoading, isSuccess } = useQuery({
        queryKey: wizardQueryKey,
        queryFn: () => fetchArtworksByIds(artworkIds),
        enabled: artworkIds.length > 0,
    });
    
    useEffect(() => {
        mainContentRef.current?.scrollTo(0, 0);
    }, [currentIndex]);

    // (handleTitleChange, handleRemoveArtwork, handleSaveAndNext, handleMoreUploadsComplete all remain the same)
    const handleTitleChange = (artworkIdToUpdate: string, newTitle: string) => {
        queryClient.setQueryData(wizardQueryKey, (oldData: any[] | undefined) => {
            if (!oldData) return [];
            return oldData.map(art => 
                art.id === artworkIdToUpdate ? { ...art, title: newTitle } : art
            );
        });
    };
    
    const handleRemoveArtwork = async (artworkIdToRemove: string, artworkTitle: string) => {
        if (!window.confirm(`Are you sure you want to permanently delete "${artworkTitle || 'this artwork'}"? This action cannot be undone.`)) {
            return;
        }
        try {
            const { error } = await supabase.from('artworks').delete().eq('id', artworkIdToRemove);
            if (error) throw error;

            queryClient.setQueryData(wizardQueryKey, (oldData: any[] | undefined) => {
                if (!oldData) return [];
                return oldData.filter(art => art.id !== artworkIdToRemove);
            });

            const newArtworkIds = artworkIds.filter(id => id !== artworkIdToRemove);

            if (newArtworkIds.length === 0) {
                alert("All artworks have been removed from the wizard.");
                navigate('/artist/artworks');
                return;
            }

            if (currentIndex >= newArtworkIds.length) {
                setCurrentIndex(newArtworkIds.length - 1);
            }
            setSearchParams({ ids: newArtworkIds.join(',') }, { replace: true });

            await queryClient.invalidateQueries({ queryKey: ['artworks'] });

        } catch (error: any) {
            alert(`Error deleting artwork: ${error.message}`);
        }
    };

    const handleSaveAndNext = () => {
        if (currentIndex < artworkIds.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            alert("All artworks have been processed!");
            navigate('/artist/artworks');
        }
    };
    
    const handleMoreUploadsComplete = (newArtworkIds: string[]) => {
        const combinedIds = [...artworkIds, ...newArtworkIds];
        setSearchParams({ ids: combinedIds.join(',') });
        setShowUploadModal(false);
        clearStore();
    };

    const currentArtwork = useMemo(() => artworks?.[currentIndex], [artworks, currentIndex]);
    const FORM_ID = 'artwork-wizard-form';

    const triggerFormSubmit = () => {
        document.getElementById(FORM_ID)?.requestSubmit();
    };

    if (isLoading) return <div>Loading artwork wizard...</div>;
    if (isSuccess && (!artworks || artworks.length === 0)) return <div>No artworks to edit. <Link to="/artist/artworks">Go back</Link></div>;

    return (
        <div>
            {showUploadModal && <ArtworkUploadModal onUploadComplete={handleMoreUploadsComplete} />}
            <header className="wizard-header">
                <Link to="/artist/artworks" className="button button-secondary"> <ArrowLeft size={16} /> Exit Wizard </Link>
                <h1>Artwork Details ({currentIndex + 1} / {artworks?.length})</h1>
                <button onClick={() => setShowUploadModal(true)} className="button button-primary"> <PlusCircle size={16} /> Add more</button>
            </header>
            <div className="wizard-layout">
                <aside className="wizard-sidebar">
                    <div className="wizard-sidebar-list">
                        {artworks?.map((art, index) => (
                            <div key={art.id} className={`wizard-thumbnail ${index === currentIndex ? 'active' : ''}`}>
                                <div onClick={() => setCurrentIndex(index)} className="wizard-thumbnail-content">
                                    <img src={art.image_url} alt={art.title || 'Untitled'} className="wizard-thumbnail-img" />
                                    <p className={`wizard-thumbnail-title ${index === currentIndex ? 'active' : ''}`}>{art.title || "Untitled"}</p>
                                </div>
                                <button onClick={() => handleRemoveArtwork(art.id, art.title)} className="button button-secondary" title="Delete Artwork">
                                    <Trash2 size={16} color="var(--color-red-danger)" />
                                </button>
                            </div>
                        ))}
                    </div>
                </aside>
                <main ref={mainContentRef} className="wizard-main-content">
                    {currentArtwork && (
                        <div className="wizard-form-layout">
                            <img src={currentArtwork.image_url} alt={currentArtwork.title || 'Untitled'} className="wizard-form-preview-img"/>
                            <div>
                                <ArtworkEditorForm 
                                    key={currentArtwork.id} 
                                    artworkId={currentArtwork.id} 
                                    onSaveSuccess={handleSaveAndNext} 
                                    formId={FORM_ID}
                                    onTitleChange={(newTitle) => handleTitleChange(currentArtwork.id, newTitle)}
                                />
                                <div className="wizard-form-footer">
                                    <button type="button" onClick={triggerFormSubmit} className="button button-primary"> {currentIndex === (artworks?.length ?? 0) - 1 ? 'Finish Wizard' : 'Save & Go to Next'} <ArrowRight size={16} /> </button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ArtworkWizardPage;