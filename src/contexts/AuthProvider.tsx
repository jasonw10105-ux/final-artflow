import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { Session, User } from '@supabase/supabase-js';

// --- Type Definitions ---
export interface Profile {
  id: string;
  full_name: string;
  slug: string;
  avatar_url: string;
  role: 'artist' | 'collector' | 'both';
  profile_completed: boolean;
  first_name?: string;
  last_name?: string;
  short_bio?: string;
  artist_statement?: string;
  contact_number?: string;
  location?: { country?: string, city?: string };
  social_links?: { platform: string, url: string }[];
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refetchProfile: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refetchProfile: async () => {},
});

// --- API Function ---
const fetchUserProfile = async (user: User | null): Promise<Profile | null> => {
    if (!user) return null;
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    if (error) {
        console.error("Error fetching profile:", error);
        return null;
    }
    return data as Profile;
};

// --- AuthProvider Component ---
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loadingInitial, setLoadingInitial] = useState(true);

    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            setLoadingInitial(false);
        };
        getSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const { data: profile, isLoading: isLoadingProfile, refetch } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: () => fetchUserProfile(user),
        enabled: !loadingInitial && !!user,
    });

    const refetchProfile = useCallback(async () => {
        return await refetch();
    }, [refetch]);

    const value = {
        user,
        profile: profile || null,
        loading: loadingInitial || (!!user && isLoadingProfile),
        refetchProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// --- Custom Hook ---
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};