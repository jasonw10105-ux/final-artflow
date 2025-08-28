// src/contexts/AuthProvider.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// Profile type from Supabase table
type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const isInitialLoadRef = useRef(true);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('Failed to fetch profile:', error.message);
      return null;
    }
    return data;
  };

  const handleAuthChange = async (newSession: Session | null) => {
    const currentUser = newSession?.user ?? null;

    setSession(newSession);
    setUser(currentUser);

    if (currentUser) {
      const userProfile = await fetchProfile(currentUser.id);
      setProfile(userProfile);
    } else {
      setProfile(null);
    }

    // Only set loading false once on initial load
    if (isInitialLoadRef.current) {
      setLoading(false);
      isInitialLoadRef.current = false;
    }
  };

  useEffect(() => {
    // Fetch initial session on mount
    supabase.auth.getSession()
      .then(({ data: { session: initialSession }, error }) => {
        if (error) {
          console.error('Error getting initial session:', error.message);
          handleAuthChange(null);
        } else {
          handleAuthChange(initialSession);
        }
      })
      .catch((e) => {
        console.error('Caught error during getSession:', (e as Error).message);
        handleAuthChange(null);
      });

    // Subscribe to auth state changes (login/logout)
    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      await handleAuthChange(newSession);
    });

    // Cleanup subscription on unmount
    return () => subscription?.subscription.unsubscribe();
  }, []);

  const signOut = async (): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    return { error };
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signOut,
  };

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading Application...</p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};