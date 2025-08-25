export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      artworks: {
        Row: {
          id: string; user_id: string; created_at: string | null; slug: string | null; title: string | null;
          description: string | null; image_url: string | null; price: number | null; status: string;
          is_price_negotiable: boolean | null; min_price: number | null; max_price: number | null;
          dimensions: Json | null; location: string | null; medium: string | null; date_info: Json | null;
          signature_info: Json | null; catalogue_id: string | null; framing_info: Json | null;
          watermarked_image_url: string | null; visualization_image_url: string | null;
          provenance: string | null; currency: string | null; updated_at: string | null; edition_info: Json | null;
        }
        Insert: { /* all fields optional */ }; Update: { /* all fields optional */ }
      }
      catalogues: { 
        Row: {
          id: string; user_id: string; title: string; description: string | null;
          cover_image_url: string | null; slug: string | null; status: string;
          is_published: boolean | null; created_at: string; is_system_catalogue: boolean
        }
        Insert: { /* all fields optional */ }; Update: { /* all fields optional */ }
      }
      conversations: {
        Row: { /* ... fields ... */ }; Insert: { /* ... fields ... */ }; Update: { /* ... fields ... */ }
      }
      profiles: {
        Row: {
          id: string; updated_at: string | null; username: string | null; slug: string | null;
          full_name: string | null; bio: string | null; avatar_url: string | null; website: string | null;
          role: "artist" | "collector" | "both" | null; profile_completed: boolean | null;
          exhibition_history: Json | null; first_name: string | null; last_name: string | null;
          short_bio: string | null; artist_statement: string | null; contact_number: string | null;
          location: Json | null; social_links: Json | null; display_name: string | null
        }
        Insert: { /* all fields optional */ }; Update: { /* all fields optional */ }
      }
      // --- ADDED YOUR NEW 'sales' TABLE DEFINITION ---
      sales: {
        Row: {
          id: string
          artwork_id: string
          artist_id: string
          collector_id: string
          sale_price: number
          sale_date: string | null
          status: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          artwork_id: string
          artist_id: string
          collector_id: string
          sale_price: number
          sale_date?: string | null
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          artwork_id?: string
          artist_id?: string
          collector_id?: string
          sale_price?: number
          sale_date?: string | null
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}