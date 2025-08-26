import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSessionAndProfile = async () => {
            try {
                // 1. Get the initial session
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                setSession(session);
                setUser(session?.user ?? null);

                // 2. If a session exists, fetch the associated profile
                if (session?.user) {
                    const { data: userProfile, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();
                    
                    if (profileError) {
                        console.error('Error fetching profile:', profileError.message);
                    }
                    setProfile(userProfile || null);
                }
            } catch (e) {
                console.error("Error during initial auth session:", (e as Error).message);
            } finally {
                // --- THIS IS THE CRITICAL FIX ---
                // 3. No matter the outcome, set loading to false after the check.
                setLoading(false);
            }
        };

        fetchSessionAndProfile();

        // Listen for auth state changes (login, logout)
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                // If user logs in, fetch their profile
                if (currentUser) {
                     const { data: userProfile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', currentUser.id)
                        .single();
                    setProfile(userProfile || null);
                } else {
                    // If user logs out, clear the profile
                    setProfile(null);
                }
                
                // Set loading to false after auth state changes as well
                setLoading(false);
            }
        );

        // Cleanup the listener on component unmount
        return () => {
            authListener?.subscription?.unsubscribe();
        };
    }, []);

    const value = {
        user,
        profile,
        session,
        loading,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};