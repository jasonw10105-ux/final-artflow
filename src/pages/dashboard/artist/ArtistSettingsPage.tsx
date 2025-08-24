
// src/pages/dashboard/artist/ArtistSettingsPage.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const ArtistSettingsPage = () => {
    const { profile, refetchProfile } = useAuth();
    const queryClient = useQueryClient();

    const [fullName, setFullName] = useState('');
    const [bio, setBio] = useState('');
    const [locationData, setLocationData] = useState({ country: '', city: '' });
    const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string; }[]>([]);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setBio(profile.bio || '');
            if (profile.location && typeof profile.location === 'object' && profile.location !== null) {
                setLocationData({
                    country: (profile.location as any)?.country || '',
                    city: (profile.location as any)?.city || '',
                });
            }
            if (profile.social_links && Array.isArray(profile.social_links)) {
                setSocialLinks(profile.social_links as any[]);
            }
        }
    }, [profile]);

    const mutation = useMutation({
        mutationFn: async (updates: any) => {
            if (!profile) throw new Error("No profile found to update.");
            const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);
            if (error) throw error;
        },
        onSuccess: async () => {
            await refetchProfile();
            queryClient.invalidateQueries({ queryKey: ['profile', profile?.id] });
            alert('Profile updated successfully!');
        },
        onError: (error) => {
            alert(`Error updating profile: ${error.message}`);
        }
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({
            full_name: fullName,
            bio,
            location: locationData,
            social_links: socialLinks,
        });
    };
    
    // Placeholder for actual form JSX
    return (
        <div>
            <h1>Artist Settings</h1>
            <form onSubmit={handleSave}>
                <div>
                    <label htmlFor="fullName">Full Name</label>
                    <input
                        id="fullName"
                        className="input"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="bio">Bio</label>
                    <textarea
                        id="bio"
                        className="input"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                    />
                </div>
                {/* Add inputs for locationData and socialLinks here */}
                <button type="submit" className="button button-primary" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
            </form>
        </div>
    );
};

export default ArtistSettingsPage;