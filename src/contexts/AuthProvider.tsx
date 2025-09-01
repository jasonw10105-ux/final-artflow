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

  // Fetch user profile from Supabase
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Failed to fetch profile:', err.message);
      return null;
    }
  };

  // Handle auth state changes
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

    if (isInitialLoadRef.current) {
      setLoading(false);
      isInitialLoadRef.current = false;
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session: initialSession }, error }) => {
        if (error) {
          console.error('Error getting initial session:', error.message);
          handleAuthChange(null);
        } else {
          handleAuthChange(initialSession);
        }
      })
      .catch((err) => {
        console.error('Caught error during getSession:', (err as Error).message);
        handleAuthChange(null);
      });

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      handleAuthChange(newSession);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async (): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    return { error };
  };

  const value: AuthContextType = { user, profile, session, loading, signOut };

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading Application...</p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};