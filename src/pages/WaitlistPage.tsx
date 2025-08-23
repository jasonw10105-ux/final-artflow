import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient'; // Uses the singleton client
import { Link } from 'react-router-dom';

const addToWaitlist = async ({ email, rolePreference }: { email: string, rolePreference: string }) => {
    const { data, error } = await supabase
        .from('waitlist_entries')
        .insert({ email, role_preference: rolePreference });
    
    if (error && error.code === '23505') {
        throw new Error("This email address is already on the waitlist.");
    }
    if (error) {
        console.error("Supabase error:", error);
        throw new Error(`Database error: ${error.message}`);
    }
    return data;
};

const WaitlistPage = () => {
    const [email, setEmail] = useState('');
    const [rolePreference, setRolePreference] = useState('artist');
    const [isSubmitted, setIsSubmitted] = useState(false);

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
        <div className="gradient-polish">
            {isSubmitted ? (
                <div className="card">
                    <div className="logo-holder">
                        <img src="../logo.svg" alt="Artflow" height="60px"/>
                    </div>
                    <h2>You're on the list!</h2>
                    <p>Thank you for joining. We'll be in touch soon with your exclusive invitation to join Artflow.</p>
                </div>
            ) : (
                <div className="card">
                    <div className="logo-holder">
                        <img src="../logo.svg" alt="Artflow" height="60px"/>
                    </div>
                    <h1>Art, sorted</h1>
                    <p>Be the first to know when we launch. Join the waitlist for exclusive early access.</p>
                    
                    <form onSubmit={handleSubmit}>
                        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" required />
                        <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.75rem' }}>I am primarily an...</label>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="radio" value="artist" checked={rolePreference === 'artist'} onChange={(e) => setRolePreference(e.target.value)} /> 
                                    Artist
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="radio" value="collector" checked={rolePreference === 'collector'} onChange={(e) => setRolePreference(e.target.value)} /> 
                                    Collector
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="radio" value="both" checked={rolePreference === 'both'} onChange={(e) => setRolePreference(e.target.value)} /> 
                                    Both
                                </label>
                            </div>
                        </div>
                        <button type="submit" className="button button-primary" disabled={mutation.isLoading}>
                            {mutation.isLoading ? 'Joining...' : 'Join Waitlist'}
                        </button>

                        <a href="">Explore platform</a>
                        {mutation.isError && <p style={{ color: 'red', marginTop: '1rem' }}>{(mutation.error as Error).message}</p>}
                    </form>
                </div>

                <section>
                    <h2>Get to know Artflow</h2>
                </section>
                <section>
                    <h2>For everyone</h2>
                </section>

                <footer>    
                    
                </footer>
            )}
        </div>
    );
};

export default WaitlistPage;
