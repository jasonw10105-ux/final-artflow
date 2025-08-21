import { createClient, SupabaseClient } from '@supabase/supabase-js';

// This singleton pattern ensures that only one instance of the Supabase client exists.
let clientInstance: SupabaseClient | null = null;

const getSupabase = () => {
    if (clientInstance) {
        return clientInstance;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase URL and Anon Key are required in your .env.local file.');
    }
    
    clientInstance = createClient(supabaseUrl, supabaseAnonKey);
    return clientInstance;
}

// Export the single, memoized instance with the name 'supabase'.
export const supabase = getSupabase();