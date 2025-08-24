// src/pages/WaitlistPage.tsx

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import { Pagination } from 'swiper/modules';

const addToWaitlist = async ({ email, rolePreference }: { email: string, rolePreference: string }) => {
    const { data, error } = await supabase
        .from('waitlist_users') // Corrected table name
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
        <>
            <div className="gradient-polish">
                {isSubmitted ? (
                    <div className="card">
                        <div className="logo-holder">
                            <img src="/logo.svg" alt="Artflow" height="60px" />
                        </div>
                        <h2>You're on the list!</h2>
                        <p>Thank you for joining. We'll be in touch soon with your exclusive invitation.</p>
                    </div>
                ) : (
                    <div className="card">
                         <div className="logo-holder">
                            <img src="/logo.svg" alt="Artflow" height="60px" />
                        </div>
                        <h1>Art, sorted</h1>
                        <p>Be the first to know when we launch. Join the waitlist for exclusive early access.</p>
                        <form onSubmit={handleSubmit}>
                            {/* ... your form inputs ... */}
                            <button type="submit" className="button button-primary" disabled={mutation.isPending}>
                                {mutation.isPending ? 'Joining...' : 'Join Waitlist'}
                            </button>
                            {/* ... your form JSX ... */}
                        </form>
                    </div>
                )}
            </div>
            {/* ... rest of your page sections ... */}
        </>
    );
};

export default WaitlistPage;