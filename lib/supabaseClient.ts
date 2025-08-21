import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// 1. Access the environment variables provided by Vercel using Vite's syntax.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Add a crucial runtime check. If the variables are missing, the application
//    will fail immediately with a clear error message, making debugging much easier.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key are not defined. Please check your Vercel environment variables.");
}

// 3. Create and export the Supabase client.
//    By passing the <Database> generic, your entire application will have
//    full type-safety and autocompletion when interacting with Supabase.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
