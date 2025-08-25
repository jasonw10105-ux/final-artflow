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
    signOut: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userToFetch: User | null) => {
        if (!userToFetch) {
            setProfile(null);
            return;
        }
        try {
            const { data: userProfile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userToFetch.id)
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

    // This function can be called from anywhere to manually refetch the profile
    const refetchProfile = async () => {
        // Use the 'user' from state, as it's the most current source of truth
        await fetchProfile(user);
    };

    // The signOut function to be exposed by the context
    const signOut = () => supabase.auth.signOut();

    useEffect(() => {
        const getInitialSession = async () => {
            const { data: { session: initialSession } } = await supabase.auth.getSession();
            setSession(initialSession);
            const currentUser = initialSession?.user ?? null;
            setUser(currentUser);
            await fetchProfile(currentUser);
            setLoading(false);
        };

        getInitialSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (_event, newSession) => {
                setSession(newSession);
                const currentUser = newSession?.user ?? null;
                setUser(currentUser);
                
                // --- IMPROVEMENT ---
                // When the auth state changes (e.g., user logs in or out),
                // we should always try to fetch the profile or clear it.
                // This makes the context reactive and up-to-date without a page refresh.
                if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') {
                    await fetchProfile(currentUser);
                }
                if (_event === 'SIGNED_OUT') {
                    setProfile(null);
                }
            }
        );

        return () => {
            authListener?.subscription?.unsubscribe();
        };
    }, []);

    const value = { user, profile, session, loading, refetchProfile, signOut };

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