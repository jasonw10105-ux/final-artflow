// src/contexts/AuthProvider.tsx

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    session: Session | null;
    loading: boolean;
    refetchProfile: () => Promise<void>;
    signOut: () => Promise<{ error: AuthError | null }>; // <-- ADDED THIS FUNCTION
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (user: User | null) => {
        if (!user) {
            setProfile(null);
            return;
        }
        try {
            const { data: userProfile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            
            if (error) {
                console.error("Error fetching profile:", error);
                setProfile(null);
            } else {
                setProfile(userProfile ?? null);
            }
        } catch (e) {
            console.error("An exception occurred while fetching profile:", e);
            setProfile(null);
        }
    };

    const refetchProfile = async () => {
        await fetchProfile(user);
    };

    // Define the signOut function
    const signOut = () => supabase.auth.signOut();

    useEffect(() => {
        const getInitialSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
            await fetchProfile(session?.user ?? null);
            setLoading(false);
        };

        getInitialSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            // No need to fetch profile here as getInitialSession handles it,
            // and subsequent logins/logouts will trigger a page reload which restarts the context.
        });

        return () => {
            authListener?.subscription?.unsubscribe();
        };
    }, []);

    const value = { user, profile, session, loading, refetchProfile, signOut }; // <-- ADDED signOut HERE

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};