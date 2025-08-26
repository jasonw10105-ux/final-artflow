import React, { createContext, useState, useEffect, useContext, ReactNode, useRef } from 'react';
import { supabase } from '../lib/supabaseClient'; // Adjust path if necessary
import { Session, User } from '@supabase/supabase-js';
import { Database } from '@/types/database.types'; // Adjust path if necessary

// Define your Profile type based on your Supabase 'profiles' table
// Make sure 'profile_completed' and 'role' are included in this type definition in database.types.ts
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
    const [loading, setLoading] = useState(true); // Start loading as true
    const isInitialLoadRef = useRef(true); // Ref to track if it's the very first load

    useEffect(() => {
        // This function centralizes the logic for processing any auth state change
        const handleAuthChange = async (newSession: Session | null) => {
            const currentUser = newSession?.user ?? null;
            
            // console.log("Auth Change Event:", _event); // For debugging: 'SIGNED_IN', 'SIGNED_OUT', 'INITIAL_SESSION' etc.
            // console.log("New Session:", newSession);

            setSession(newSession);
            setUser(currentUser);

            if (currentUser) {
                // Fetch profile only if a user is present
                const { data: userProfile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*') // Select all columns, assuming 'profile_completed' and 'role' are here
                    .eq('id', currentUser.id)
                    .single();
                
                if (profileError) {
                    console.error('Error fetching user profile:', profileError.message);
                    // Decide how to handle this: maybe set a default incomplete profile
                    // or navigate to a profile completion page even if profile fetch failed.
                    setProfile(null); 
                } else {
                    setProfile(userProfile);
                }
            } else {
                // No user, clear profile
                setProfile(null);
            }

            // Only set loading to false after the initial state has been fully processed.
            // Subsequent auth changes will update state but don't need to re-set loading from true to false.
            if (isInitialLoadRef.current) {
                setLoading(false);
                isInitialLoadRef.current = false;
            }
        };

        // 1. Fetch the initial session explicitly.
        // This ensures we get the current state right away, even before the listener might fire
        // for an existing session.
        supabase.auth.getSession()
            .then(({ data: { session: initialSession }, error: initialError }) => {
                if (initialError) {
                    console.error("Error getting initial Supabase session:", initialError.message);
                    handleAuthChange(null); // Treat as no session if error
                } else {
                    handleAuthChange(initialSession); // Process initial session
                }
            })
            .catch(e => {
                console.error("Caught error during getSession:", (e as Error).message);
                handleAuthChange(null); // Ensure state is cleared on error
            })
            .finally(() => {
                // Ensure loading is false even if getSession() or handleAuthChange has issues,
                // and if the listener hasn't already done so.
                if (isInitialLoadRef.current) {
                    setLoading(false);
                    isInitialLoadRef.current = false;
                }
            });


        // 2. Set up the real-time listener for any subsequent auth state changes.
        // This will trigger for sign-in, sign-out, token refresh, etc.
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (_event, newSession) => {
                // Only re-run the full logic if it's a *different* session state or a relevant event
                // to avoid redundant work, though `handleAuthChange` is idempotent enough.
                // The `_event` parameter can be useful for granular control if needed.
                if (JSON.stringify(newSession) !== JSON.stringify(session)) { // Simple check for session change
                   await handleAuthChange(newSession);
                } else if (!newSession && user) { // If session is null but user is still set (e.g. forced logout)
                   await handleAuthChange(null);
                }
                // We do NOT set setLoading(false) here because isInitialLoadRef handles the first time.
                // For subsequent changes, `loading` typically remains false unless specifically
                // set to true for a short duration during a sign-in/out process if needed.
            }
        );

        // Cleanup the subscription when the component unmounts
        return () => {
            authListener?.subscription?.unsubscribe();
        };
    }, []); // Empty dependency array ensures this effect runs only once on mount

    const signOut = () => supabase.auth.signOut();

    const value = {
        user,
        profile,
        session,
        loading,
        signOut,
    };

    // Render children only when not in the initial loading state
    // This prevents components that rely on user/profile from rendering prematurely.
    if (loading) {
        return (
            <div className="loading-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <p>Loading Application...</p>
            </div>
        );
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};