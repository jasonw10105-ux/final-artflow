import { Session, User } from '@supabase/supabase-js';
import React, { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface Profile {
  id: string; full_name: string; role: 'artist' | 'collector' | 'both';
  profile_completed: boolean; username: string; slug: string; bio: string;
  exhibition_history: any; avatar_url?: string;
}
interface AuthContextType {
  user: User | null; session: Session | null; profile: Profile | null; loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (session?.user) {
        // --- THIS IS THE CRITICAL FIX ---
        // We now use .maybeSingle() instead of .single().
        // .maybeSingle() will return the first row if multiple exist (which the SQL fix now prevents)
        // or null if zero exist, but it will NEVER throw the 406 error.
        // This makes the application resilient against this specific crash.
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle(); // Use maybeSingle() for maximum safety
        
        if (error) {
            console.error("AuthProvider Error: Could not fetch user profile.", error.message);
        } else if (data) {
            setProfile(data as Profile);
        }
      } else {
        setProfile(null);
      }
    };
    fetchProfile();
  }, [session]);

  const value = {
    user: session?.user ?? null, session, profile,
    loading: loading || (!!session && !profile),
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};