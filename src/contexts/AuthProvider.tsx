import React, a, { useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

// This type definition is crucial and fixes the 'session' errors
export interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getInitialSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                setProfile(userProfile);
            }
            setLoading(false);
        };

        getInitialSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                    setProfile(userProfile);
                } else {
                    setProfile(null);
                }
                setLoading(false);
            }
        );

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

    const value = { session, user, profile, loading };

    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};