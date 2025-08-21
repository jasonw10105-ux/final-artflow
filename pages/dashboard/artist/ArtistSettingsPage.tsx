import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth, Profile } from '../../../contexts/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const ArtistSettingsPage = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    const [fullName, setFullName] = useState('');
    const [bio, setBio] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setBio(profile.bio || '');
        }
    }, [profile]);
    
    const profileMutation = useMutation(async () => {
        if (!user || !profile) throw new Error("User not found.");
        
        const slug = profile.slug || (await supabase.rpc('generate_unique_slug', { input_text: fullName, table_name: 'profiles' })).data;
        
        const { error } = await supabase.from('profiles').update({ full_name: fullName, bio: bio, slug }).eq('id', user.id);
        if (error) throw error;
    }, {
        onSuccess: () => {
            queryClient.invalidateQueries(['profile', user?.id]);
            alert('Profile updated successfully!');
        },
        onError: (error: any) => alert(error.message)
    });

    const passwordMutation = useMutation(async () => {
        if (newPassword !== confirmPassword) throw new Error("Passwords do not match.");
        if (newPassword.length < 6) throw new Error("Password must be at least 6 characters.");
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
    }, {
        onSuccess: async () => {
            alert('Password updated! You will be logged out for security.');
            await supabase.auth.signOut();
            navigate('/login');
        },
        onError: (error: any) => alert(error.message)
    });

    return (
        <div>
            <h1>Settings</h1>
            <fieldset>
                <legend>Profile Information</legend>
                <label>Full Name</label>
                <input className="input" type="text" value={fullName} onChange={e => setFullName(e.target.value)} />
                <label>Bio</label>
                <textarea className="input" value={bio} onChange={e => setBio(e.target.value)} />
                <button onClick={() => profileMutation.mutate()} className="button button-primary" disabled={profileMutation.isLoading}>
                    {profileMutation.isLoading ? 'Updating...' : 'Update Profile'}
                </button>
            </fieldset>

            <fieldset>
                <legend>Account Security</legend>
                <label>Email Address</label>
                <input className="input" type="email" value={user?.email} disabled />
                <label>New Password</label>
                <input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password"/>
                <label>Confirm New Password</label>
                <input className="input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password"/>
                <button onClick={() => passwordMutation.mutate()} className="button button-primary" disabled={passwordMutation.isLoading}>
                    {passwordMutation.isLoading ? 'Updating...' : 'Update Password'}
                </button>
            </fieldset>
        </div>
    );
};
export default ArtistSettingsPage;
