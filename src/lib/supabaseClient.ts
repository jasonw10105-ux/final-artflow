import { createClient, SupabaseClient } from '@supabase/supabase-js';

// This singleton pattern ensures that only one instance of the Supabase client exists,
// preventing the "Multiple GoTrueClient instances" warning during development.

let clientInstance: SupabaseClient | null = null;

const getSupabase = () => {
    // If an instance already exists, return it.
    if (clientInstance) {
        return clientInstance;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase URL and Anon Key are required in your .env.local file.');
    }
    
    // Create the instance for the first time.
    clientInstance = createClient(supabaseUrl, supabaseAnonKey);
    return clientInstance;
}

// Export the single, memoized instance with the name 'supabase'.
// Every other file in the app imports 'supabase', so this consistency is critical.
export const supabase = getSupabase();