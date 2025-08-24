// src/contexts/AuthProvider.tsx

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient'; // <-- Using new @/ alias
import { Session, User } from '@supabase/supabase-js';
import { Database } from '@/types/database.types'; // <-- Using new @/ alias

// Define the shape of a user profile from your database types
type Profile = Database['public']['Tables']['profiles']['Row'];

// Define the shape of the context data
export interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    session: Session | null; // <-- Add session back for compatibility if needed elsewhere
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the props for the AuthProvider component
interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getInitialSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                const { data: userProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                setProfile(userProfile);
            }
            setLoading(false);
        };

        getInitialSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setLoading(true);
            setSession(session);
            setUser(session?.user ?? null);
            
            if (session?.user) {
                 const { data: userProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                setProfile(userProfile ?? null);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const value = {
        user,
        profile,
        session,
        loading,
    };

    // Render the provider with the value, only showing children when not loading initially
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};