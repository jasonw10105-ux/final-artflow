// src/pages/CompleteProfilePage.tsx

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import Button from '@/components/ui/Button';
import ImageUpload from '@/components/ui/ImageUpload';
import styles from '@/styles/AuthPage.module.css';

const CompleteProfilePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState('');
    const [bio, setBio] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    
    const [loading, setLoading] = useState(false);

    // Derived state to check if the user is an artist type
    const isArtistType = role === 'artist' || role === 'both';

    const handleProfileComplete = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // --- Validation based on role ---
        if (!user || !role || !firstName || !lastName) {
            toast.error("Please fill in your name and select a role.");
            return;
        }
        if (isArtistType && !bio) {
            toast.error("As an artist, a bio is required.");
            return;
        }
        if (isArtistType && !avatarFile) {
            toast.error("As an artist, a profile picture is required.");
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Setting up your profile...');

        try {
            let avatarUrl = null;

            // 1. Upload avatar if it exists
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const filePath = `${user.id}/${uuidv4()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, avatarFile);
                
                if (uploadError) throw new Error(`Avatar upload failed: ${uploadError.message}`);
                
                const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
                avatarUrl = data.publicUrl;
            }

            const fullName = `${firstName} ${lastName}`.trim();
            
            // 2. Generate a unique slug
            const { data: slugData, error: slugError } = await supabase.rpc('generate_unique_slug', { input_text: fullName, table_name: 'profiles' });
            if (slugError) throw slugError;

            // 3. Update the user's profile
            const profileUpdates = {
                id: user.id,
                first_name: firstName,
                last_name: lastName,
                full_name: fullName,
                role: role,
                profile_completed: true,
                slug: slugData,
                bio: isArtistType ? bio : null,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString(),
            };
            const { error: profileError } = await supabase.from('profiles').upsert(profileUpdates);
            if (profileError) throw profileError;

            // 4. Create default catalogue for artist types
            if (isArtistType) {
                const { error: catalogueError } = await supabase.from('catalogues').insert({
                    user_id: user.id,
                    title: 'Available Work',
                    is_system_catalogue: true,
                    status: 'Published', // Assuming this is a valid status text
                    is_published: true,
                });
                if (catalogueError) console.warn("Could not create default catalogue:", catalogueError.message);
            }
            
            toast.success('Profile complete! Redirecting...', { id: toastId });
            // Using window.location.replace to ensure a full refresh that re-fetches user state
            window.location.replace('/dashboard'); 

        } catch (err: any) {
            toast.error(`Error: ${err.message}`, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.authLayout} style={{gridTemplateColumns: '1fr'}}>
            <main className={styles.formPanel}>
                <div className={styles.authCard} style={{maxWidth: '600px'}}>
                    <header className={styles.cardHeader}>
                        <img src="/logo.svg" alt="Artflow" height="50px" className={styles.logoHolder} />
                        <h2>Complete Your Profile</h2>
                        <p>Just a few more details to get you started.</p>
                    </header>
                    
                    <form onSubmit={handleProfileComplete} className={styles.authForm}>
                        <ImageUpload onFileSelect={setAvatarFile} />

                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                            <div className="form-group">
                                <label className="label" htmlFor="firstName">First Name *</label>
                                <input id="firstName" className="input" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="label" htmlFor="lastName">Last Name *</label>
                                <input id="lastName" className="input" type="text" value={lastName} onChange={e => setLastName(e.target.value)} required />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="label" htmlFor="role">Your Primary Role *</label>
                            <select id="role" className="input" value={role} onChange={e => setRole(e.target.value)} required>
                                <option value="" disabled>-- Select a Role --</option>
                                <option value="artist">Artist</option>
                                <option value="collector">Collector</option>
                                <option value="both">Both Artist & Collector</option>
                            </select>
                        </div>
                        
                        {/* Conditionally render bio for artist types */}
                        {isArtistType && (
                             <div className="form-group">
                                <label className="label" htmlFor="bio">
                                    Your Bio * <span style={{fontWeight: 400, color: 'var(--muted-foreground)'}}>(A short bio is required for artists)</span>
                                </label>
                                <textarea 
                                    id="bio" 
                                    className="textarea" 
                                    value={bio} 
                                    onChange={e => setBio(e.target.value)}
                                    placeholder="Tell us a little about yourself and your work..."
                                    required={isArtistType} 
                                />
                            </div>
                        )}
                        
                        <Button type="submit" variant="primary" isLoading={loading} style={{marginTop: '1rem'}}>
                            Complete Registration
                        </Button>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CompleteProfilePage;