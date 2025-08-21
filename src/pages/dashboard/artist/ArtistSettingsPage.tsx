// src/pages/dashboard/artist/ArtistSettingsPage.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2 } from 'lucide-react';

const ArtistSettingsPage = () => {
    const { user, profile, refetchProfile } = useAuth();
    const navigate = useNavigate();
    
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [shortBio, setShortBio] = useState('');
    const [artistStatement, setArtistStatement] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [locationCountry, setLocationCountry] = useState('');
    const [locationCity, setLocationCity] = useState('');
    const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>([]);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [initialData, setInitialData] = useState<any>(null);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (profile) {
            const initial = {
                firstName: profile.first_name || '',
                lastName: profile.last_name || '',
                fullName: profile.full_name || '',
                shortBio: profile.short_bio || '',
                artistStatement: profile.artist_statement || '',
                contactNumber: profile.contact_number || '',
                locationCountry: profile.location?.country || '',
                locationCity: profile.location?.city || '',
                socialLinks: profile.social_links || [],
            };
            setFirstName(initial.firstName);
            setLastName(initial.lastName);
            setShortBio(initial.shortBio);
            setArtistStatement(initial.artistStatement);
            setContactNumber(initial.contactNumber);
            setLocationCountry(initial.locationCountry);
            setLocationCity(initial.locationCity);
            setSocialLinks(initial.socialLinks);
            setAvatarPreview(profile.avatar_url || null);
            setInitialData(initial);
        }
    }, [profile]);
    
    useEffect(() => {
        if (!initialData) return;
        const hasTextChanged = firstName !== initialData.firstName || lastName !== initialData.lastName || shortBio !== initialData.shortBio || artistStatement !== initialData.artistStatement || contactNumber !== initialData.contactNumber || locationCountry !== initialData.locationCountry || locationCity !== initialData.locationCity || JSON.stringify(socialLinks) !== JSON.stringify(initialData.socialLinks);
        const hasNewFile = !!avatarFile;
        setIsDirty(hasTextChanged || hasNewFile);
    }, [firstName, lastName, shortBio, artistStatement, contactNumber, locationCountry, locationCity, socialLinks, avatarFile, initialData]);

    const profileMutation = useMutation({
        mutationFn: async () => {
            if (!user || !profile) throw new Error("User not found.");
            
            let newAvatarUrl = profile.avatar_url;
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop();
                const filePath = `${user.id}/profile-${uuidv4()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile, { upsert: true });
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
                newAvatarUrl = publicUrl;
            }

            const newFullName = `${firstName} ${lastName}`.trim();
            let finalSlug = profile.slug;

            if (newFullName !== profile.full_name) {
                const { data: newSlugData, error: slugError } = await supabase.rpc('update_profile_and_handle_slug', { p_profile_id: user.id, p_new_full_name: newFullName, p_current_slug: profile.slug });
                if (slugError) throw new Error("Error updating profile slug history.");
                finalSlug = newSlugData;
            }

            const updateData = { first_name: firstName, last_name: lastName, full_name: newFullName, slug: finalSlug, short_bio: shortBio, artist_statement: artistStatement, contact_number: contactNumber, location: { country: locationCountry, city: locationCity }, social_links: socialLinks, avatar_url: newAvatarUrl, profile_completed: !!(firstName && lastName) };

            const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id);
            if (error) throw error;
        },
        onSuccess: async () => {
            await refetchProfile();
            alert('Profile updated successfully! Your public URL may have changed.');
            setAvatarFile(null);
        },
        onError: (error: any) => alert(`Error updating profile: ${error.message}`)
    });

    const passwordMutation = useMutation({
        mutationFn: async () => {
            if (newPassword !== confirmPassword) throw new Error("Passwords do not match.");
            if (newPassword.length < 6) throw new Error("Password must be at least 6 characters.");
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
        },
        onSuccess: async () => {
            alert('Password updated! You will be logged out for security.');
            await supabase.auth.signOut();
            navigate('/login');
        },
        onError: (error: any) => alert(error.message)
    });

    const handleSocialChange = (index: number, field: 'platform' | 'url', value: string) => { const newLinks = [...socialLinks]; newLinks[index][field] = value; setSocialLinks(newLinks); };
    const addSocialLink = () => setSocialLinks([...socialLinks, { platform: 'instagram', url: '' }]);
    const removeSocialLink = (index: number) => setSocialLinks(socialLinks.filter((_, i) => i !== index));
    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { const file = e.target.files[0]; setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); } };

    return (
        <div>
            <h1>Settings</h1>
            <fieldset><legend>Public Profile Information</legend><div style={{display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem'}}><img src={avatarPreview || `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`} alt="Profile" style={{width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover'}}/><div><label htmlFor="avatar-upload">Profile Image</label><input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} style={{border: '1px solid var(--border)', padding: '0.5rem', borderRadius: 'var(--radius)'}}/><p style={{fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.5rem'}}>Recommended: Square, at least 400x400 pixels.</p></div></div><div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}><div><label>First Name</label><input className="input" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} /></div><div><label>Last Name</label><input className="input" type="text" value={lastName} onChange={e => setLastName(e.target.value)} /></div></div><label>Short Bio (Headline)</label><textarea className="input" value={shortBio} onChange={e => setShortBio(e.target.value)} maxLength={240} /><p style={{textAlign: 'right', fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '-0.75rem'}}>{shortBio.length} / 240</p><label>Artist Statement</label><textarea className="input" value={artistStatement} onChange={e => setArtistStatement(e.target.value)} rows={6} /><div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}><div><label>Contact Number</label><input className="input" type="tel" value={contactNumber} onChange={e => setContactNumber(e.target.value)} /></div><div><label>Country</label><input className="input" type="text" value={locationCountry} onChange={e => setLocationCountry(e.target.value)} placeholder="e.g., United States" /></div></div><div><label>City (Optional)</label><input className="input" type="text" value={locationCity} onChange={e => setLocationCity(e.target.value)} placeholder="e.g., New York" /></div></fieldset>
            <fieldset><legend>Social Media Links</legend>{socialLinks.map((link, index) => (<div key={index} style={{display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '1rem', alignItems: 'center', marginBottom: '1rem'}}><select className="input" value={link.platform} onChange={e => handleSocialChange(index, 'platform', e.target.value)}><option value="instagram">Instagram</option><option value="twitter">Twitter / X</option><option value="facebook">Facebook</option><option value="website">Website</option><option value="other">Other</option></select><input className="input" type="url" value={link.url} onChange={e => handleSocialChange(index, 'url', e.target.value)} placeholder="https://..." /><button onClick={() => removeSocialLink(index)} className="button-secondary" style={{padding: '0.5rem'}}><Trash2 size={16} /></button></div>))}<button onClick={addSocialLink} className="button-secondary" style={{display: 'flex', gap: '0.5rem'}}><Plus size={16} /> Add Link</button></fieldset>
            <button onClick={() => profileMutation.mutate()} className="button button-primary" disabled={!isDirty || profileMutation.isPending} style={{width: '100%', padding: '1rem', marginTop: '1rem'}}>{profileMutation.isPending ? 'Saving Changes...' : 'Update Profile Information'}</button>
            <fieldset><legend>Account Security</legend><label>Email Address</label><input className="input" type="email" value={user?.email || ''} disabled /><label>New Password</label><input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank to keep current password"/><label>Confirm New Password</label><input className="input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /><button onClick={() => passwordMutation.mutate()} className="button button-primary" disabled={passwordMutation.isPending || !newPassword}>{passwordMutation.isPending ? 'Updating...' : 'Update Password'}</button></fieldset>
        </div>
    );
};
export default ArtistSettingsPage;