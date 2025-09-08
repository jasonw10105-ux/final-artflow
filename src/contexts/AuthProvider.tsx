import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { HelmetProvider } from 'react-helmet-async'; // Import HelmetProvider

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

      if (error) {
        // If profile doesn't exist (PGRST116), it's not an error to prevent loading
        if (error.code === 'PGRST116') {
            console.warn(`Profile for user ${userId} not found, but session exists.`);
            return null;
        }
        throw error; // Re-throw other database errors
      }
      return data;
    } catch (err: any) {
      // Catch network errors (TypeError) specifically
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        console.error('Failed to fetch profile due to network error (TypeError: Failed to fetch). Check Supabase connection or CORS:', err);
      } else {
        console.error('Failed to fetch profile (other error):', err.message);
      }
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
      .then(async ({ data: { session: initialSession }, error }) => { // Marked as async here
        if (error) {
          console.error('Error getting initial session:', error.message);
          await handleAuthChange(null); // Ensure handleAuthChange is awaited
        } else {
          await handleAuthChange(initialSession); // Ensure handleAuthChange is awaited
        }
      })
      .catch(async (err) => { // Catch block should be async too
        // Catch network errors during getSession itself
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
            console.error('Initial Supabase session fetch failed due to network error (TypeError: Failed to fetch). Check Supabase connection or CORS:', err);
        } else {
            console.error('Caught error during getSession:', (err as Error).message);
        }
        await handleAuthChange(null); // Ensure handleAuthChange is awaited
      })
      .finally(() => {
          // In case none of the above caught or completed, ensure loading is set to false
          if (isInitialLoadRef.current) {
              setLoading(false);
              isInitialLoadRef.current = false;
          }
      });

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Don't mark as initial load anymore on subsequent changes
      handleAuthChange(newSession);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async (): Promise<{ error: Error | null }> => {
    // Set loading to true while signing out
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setLoading(false); // Set loading to false after signOut completes
    return { error };
  };

  const value: AuthContextType = { user, profile, session, loading, signOut };

  if (loading) {
    return (
      <div className="loading-container" style={{ backgroundColor: 'red', color: 'white', fontSize: '30px', textAlign: 'center', padding: '50px', border: '5px solid yellow', position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <p>Loading Application...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      <HelmetProvider> {/* Wrap children with HelmetProvider */}
        {children}
      </HelmetProvider>
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};