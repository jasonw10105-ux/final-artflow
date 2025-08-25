// src/pages/CompleteProfilePage.tsx

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import ImageUpload from '@/components/ui/ImageUpload';

const CompleteProfilePage = () => {
    const { user } = useAuth();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState('');
    const [bio, setBio] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const isArtistType = role === 'artist' || role === 'both';

    const handleProfileComplete = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            toast.error("You must be logged in to complete your profile.");
            return;
        }

        if (isArtistType && !avatarFile) {
            toast.error("Artists must upload a profile picture.");
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Finalizing your profile...');

        try {
            let avatarUrl = null;
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const filePath = `${user.id}/${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile);
                if (uploadError) throw uploadError;
                
                const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
                avatarUrl = data.publicUrl;
            }

            const fullName = `${firstName} ${lastName}`.trim();
            
            const { data: slugData, error: slugError } = await supabase.rpc('generate_unique_slug', { input_text: fullName, table_name: 'profiles' });
            if (slugError) throw slugError;

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

            if (isArtistType) {
                const { error: catalogueError } = await supabase.from('catalogues').insert({
                    user_id: user.id,
                    title: 'Available Work',
                    is_system_catalogue: true,
                    status: 'Published',
                    is_published: true,
                });
                if (catalogueError) console.warn("Could not create default catalogue:", catalogueError.message);
            }
            
            toast.success('Profile complete! Redirecting...', { id: toastId });
            // Using a slight delay to allow the user to see the success message
            setTimeout(() => {
                window.location.href = isArtistType ? '/artist/dashboard' : '/collector/dashboard';
            }, 1000);

        } catch (err: any) {
            toast.error(`Error: ${err.message}`, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-layout single-panel">
            <main className="auth-form-panel">
                <div className="auth-card wide">
                    <header className="auth-card-header">
                        <div className="logo-holder">
                           <img src="/logo.svg" alt="Artflow" height="50px" />
                        </div>
                        <h2>Complete Your Profile</h2>
                        <p>Just a few more details to get you started.</p>
                    </header>
                    
                    <form onSubmit={handleProfileComplete} className="auth-form">
                        <ImageUpload onFileSelect={setAvatarFile} />
                        
                        {isArtistType && <p className="form-hint">A profile picture is required for artists.</p>}

                        <div className="form-grid-2-col">
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
                        
                        {isArtistType && (
                             <div className="form-group">
                                <label className="label" htmlFor="bio">
                                    Your Bio * <span className="label-hint">(Required for artists)</span>
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
                        
                        <Button type="submit" variant="primary" isLoading={loading} className="primary full-width">
                            Complete Registration
                        </Button>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CompleteProfilePage;