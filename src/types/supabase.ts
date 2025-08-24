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
          id: string
          user_id: string
          created_at: string | null
          slug: string | null
          title: string | null
          description: string | null
          image_url: string | null
          price: number | null
          status: string
          is_price_negotiable: boolean | null
          min_price: number | null
          max_price: number | null
          dimensions: Json | null
          location: string | null
          medium: string | null
          date_info: Json | null
          signature_info: Json | null
          // --- ADDED FIELDS START ---
          catalogue_id: string | null
          framing_info: Json | null
          watermarked_image_url: string | null
          visualization_image_url: string | null
          provenance: string | null
          currency: string | null
          updated_at: string | null
          edition_info: Json | null
          // --- ADDED FIELDS END ---
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string | null
          slug?: string | null
          title?: string | null
          description?: string | null
          image_url?: string | null
          price?: number | null
          status?: string
          is_price_negotiable?: boolean | null
          min_price?: number | null
          max_price?: number | null
          dimensions?: Json | null
          location?: string | null
          medium?: string | null
          date_info?: Json | null
          signature_info?: Json | null
          // --- ADDED FIELDS START ---
          catalogue_id?: string | null
          framing_info?: Json | null
          watermarked_image_url?: string | null
          visualization_image_url?: string | null
          provenance?: string | null
          currency?: string | null
          updated_at?: string | null
          edition_info?: Json | null
          // --- ADDED FIELDS END ---
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string | null
          slug?: string | null
          title?: string | null
          description?: string | null
          image_url?: string | null
          price?: number | null
          status?: string
          is_price_negotiable?: boolean | null
          min_price?: number | null
          max_price?: number | null
          dimensions?: Json | null
          location?: string | null
          medium?: string | null
          date_info?: Json | null
          signature_info?: Json | null
          // --- ADDED FIELDS START ---
          catalogue_id?: string | null
          framing_info?: Json | null
          watermarked_image_url?: string | null
          visualization_image_url?: string | null
          provenance?: string | null
          currency?: string | null
          updated_at?: string | null
          edition_info?: Json | null
          // --- ADDED FIELDS END ---
        }
      }
      catalogues: { // Assumed structure based on previous context
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          cover_image_url: string | null
          slug: string | null
          status: string
          is_published: boolean | null
          created_at: string
          is_system_catalogue: boolean // Required for the "Available Work" feature
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          cover_image_url?: string | null
          slug?: string | null
          status?: string
          is_published?: boolean | null
          created_at?: string
          is_system_catalogue?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          cover_image_url?: string | null
          slug?: string | null
          status?: string
          is_published?: boolean | null
          created_at?: string
          is_system_catalogue?: boolean
        }
      }
      conversations: {
        Row: {
          id: string
          artist_id: string
          artwork_id: string
          inquirer_name: string
          inquirer_email: string | null
          inquirer_contact_number: string | null
          inquirer_user_id: string | null
          status: string
          artist_unread: boolean | null
          last_message_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          artist_id: string
          artwork_id: string
          inquirer_name: string
          inquirer_email?: string | null
          inquirer_contact_number?: string | null
          inquirer_user_id?: string | null
          status?: string
          artist_unread?: boolean | null
          last_message_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          artist_id?: string
          artwork_id?: string
          inquirer_name?: string
          inquirer_email?: string | null
          inquirer_contact_number?: string | null
          inquirer_user_id?: string | null
          status?: string
          artist_unread?: boolean | null
          last_message_at?: string | null
          created_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          username: string | null
          slug: string | null
          full_name: string | null
          bio: string | null
          avatar_url: string | null
          website: string | null
          role: "artist" | "collector" | "both" | null
          profile_completed: boolean | null
          exhibition_history: Json | null
          // --- ADDED FIELDS based on previous context ---
          first_name: string | null
          last_name: string | null
          short_bio: string | null
          artist_statement: string | null
          contact_number: string | null
          location: Json | null
          social_links: Json | null
          display_name: string | null
        }
        Insert: {
          id: string
          updated_at?: string | null
          username?: string | null
          slug?: string | null
          full_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          website?: string | null
          role?: "artist" | "collector" | "both" | null
          profile_completed?: boolean | null
          exhibition_history?: Json | null
          // --- ADDED FIELDS based on previous context ---
          first_name?: string | null
          last_name?: string | null
          short_bio?: string | null
          artist_statement?: string | null
          contact_number?: string | null
          location?: Json | null
          social_links?: Json | null
          display_name?: string | null
        }
        Update: {
          id?: string
          updated_at?: string | null
          username?: string | null
          slug?: string | null
          full_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          website?: string | null
          role?: "artist" | "collector" | "both" | null
          profile_completed?: boolean | null
          exhibition_history?: Json | null
          // --- ADDED FIELDS based on previous context ---
          first_name?: string | null
          last_name?: string | null
          short_bio?: string | null
          artist_statement?: string | null
          contact_number?: string | null
          location?: Json | null
          social_links?: Json | null
          display_name?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}