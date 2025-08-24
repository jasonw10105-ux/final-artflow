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
    // FIX: Define the locationData state and its setter function
    const [locationData, setLocationData] = useState({ country: '', city: '' });
    const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string; }[]>([]);
    
    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setBio(profile.bio || '');
            if (profile.location && typeof profile.location === 'object') {
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
            if (!profile) throw new Error("No profile found");
            const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);
            if (error) throw error;
        },
        onSuccess: async () => {
            await refetchProfile();
            alert('Profile updated successfully!');
        },
        onError: (error) => {
            alert(`Error updating profile: ${error.message}`);
        }
    });

    const handleSave = () => {
        mutation.mutate({
            full_name: fullName,
            bio,
            location: locationData,
            social_links: socialLinks,
        });
    };

    return (
        <div>
            <h1>Artist Settings</h1>
            {/* Your form JSX would go here, using the state variables */}
            <button onClick={handleSave} disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
        </div>
    );
};

export default ArtistSettingsPage; // FIX: Added the default export