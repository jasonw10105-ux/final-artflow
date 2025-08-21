import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient'; // Uses your correct client
import { Link } from 'react-router-dom';

const addToWaitlist = async ({ email, rolePreference }: { email: string, rolePreference: string }) => {
    const { data, error } = await supabase
        .from('waitlist_entries')
        .insert({ email, role_preference: rolePreference })
        .select()
        .single();
    
    if (error && error.code === '23505') {
        throw new Error("This email address is already on the waitlist.");
    }
    if (error) {
        throw new Error(`Database error: ${error.message}`);
    }
    return data;
};

const WaitlistPage = () => {
    const [email, setEmail] = useState('');
    const [rolePreference, setRolePreference] = useState('artist');
    const [isSubmitted, setIsSubmitted] = useState(false);

    // --- THIS IS THE CRITICAL FIX ---
    // The useMutation call has been converted to the required "Object" syntax for v5.
    const mutation = useMutation({
        mutationFn: addToWaitlist,
        onSuccess: () => {
            setIsSubmitted(true);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate({ email, rolePreference });
    };

    return (
        <div class="gradient-polish" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
           
            {isSubmitted ? (
                <div style={{ textAlign: 'center', background: 'var(--card)', padding: '3rem', borderRadius: 'var(--radius)' }}>
                    <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>You're on the list!</h2>
                    <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.6 }}>Thank you for joining. We'll be in touch soon with your exclusive invitation to join Artflow.</p>
                </div>
            ) : (
                <div>
                    <h1 style={{ marginBottom: '1rem' }}>The Studio OS is Coming Soon</h1>
                    <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem', fontSize: '1.1rem' }}>Be the first to know when we launch. Join the waitlist for exclusive early access.</p>
                    
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--card)', padding: '2rem', borderRadius: 'var(--radius)' }}>
                        <input 
                            className="input" 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            placeholder="Enter your email address" 
                            required 
                        />
                        
                        <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.75rem' }}>I am primarily an...</label>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="radio" value="artist" checked={rolePreference === 'artist'} onChange={(e) => setRolePreference(e.target.value)} /> Artist</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="radio" value="collector" checked={rolePreference === 'collector'} onChange={(e) => setRolePreference(e.target.value)} /> Collector</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><input type="radio" value="both" checked={rolePreference === 'both'} onChange={(e) => setRolePreference(e.target.value)} /> Both</label>
                            </div>
                        </div>
                        
                        <button type="submit" className="button button-primary" disabled={mutation.isLoading}>
                            {mutation.isLoading ? 'Joining...' : 'Join Waitlist'}
                        </button>

                        {mutation.isError && (
                            <p style={{ color: 'red', marginTop: '1rem' }}>{(mutation.error as Error).message}</p>
                        )}
                    </form>
                </div>
            )}
        </div>
    );
};

export default WaitlistPage;