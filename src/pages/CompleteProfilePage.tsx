// src/pages/CompleteProfilePage.tsx

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthProvider';

const CompleteProfilePage = () => {
    const { user } = useAuth();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleProfileComplete = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (!user || !role || !firstName || !lastName || password.length < 6) {
            setError("Please fill all fields. Password must be at least 6 characters.");
            return;
        }

        setLoading(true);
        const fullName = `${firstName} ${lastName}`.trim();

        try {
            const { data: slugData, error: slugError } = await supabase.rpc('generate_unique_slug', { input_text: fullName, table_name: 'profiles' });
            if (slugError) throw slugError;

            const { error: passwordError } = await supabase.auth.updateUser({ password });
            if (passwordError) throw passwordError;
            
            const profileUpdates = {
                id: user.id,
                first_name: firstName,
                last_name: lastName,
                full_name: fullName,
                role: role,
                profile_completed: true,
                slug: slugData,
                updated_at: new Date(),
            };
            const { error: profileError } = await supabase.from('profiles').upsert(profileUpdates);
            if (profileError) throw profileError;

            if (role === 'artist' || role === 'both') {
                const { data: catalogueSlugData } = await supabase.rpc('generate_unique_slug', { input_text: 'Available Work', table_name: 'catalogues' });
                
                const defaultCatalogue = {
                    user_id: user.id,
                    title: 'Available Work',
                    is_system_catalogue: true,
                    status: 'Published',
                    slug: catalogueSlugData,
                };
                
                const { error: catalogueError } = await supabase.from('catalogues').insert(defaultCatalogue);
                if (catalogueError) console.error("Could not create default catalogue:", catalogueError.message);
            }
            
            window.location.replace('/dashboard'); 
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="gradient-polish" style={{ maxWidth: '500px', margin: '3rem auto', padding: '2rem', background: 'var(--card)', borderRadius: 'var(--radius)' }}>
            <h2 style={{ textAlign: 'center' }}>Complete Your Profile</h2>
            <p style={{ textAlign: 'center', color: 'var(--muted-foreground)', marginBottom: '2rem' }}>Just a few more details to get you started.</p>
            <form onSubmit={handleProfileComplete}>
                {/* ... The rest of your form JSX is correct ... */}
                <button type="submit" className="button button-primary" style={{ width: '100%' }} disabled={loading}>
                    {loading ? 'Saving...' : 'Complete Registration'}
                </button>
            </form>
        </div>
    );
};

export default CompleteProfilePage;