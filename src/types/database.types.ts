// src/types/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      artwork_features: {
        Row: {
          artwork_id: string
          color_palette: Json | null
          created_at: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          artwork_id: string
          color_palette?: Json | null
          created_at?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          artwork_id?: string
          color_palette?: Json | null
          created_at?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artwork_features_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: true
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
        ]
      }
      artworks: {
        Row: {
          catalogue_id: string | null
          created_at: string | null
          currency: string | null
          date_info: Json | null
          description: string | null
          dimensions: Json | null
          edition_info: Json | null
          framing_info: Json | null
          id: string
          image_url: string | null
          is_price_negotiable: boolean | null
          location: string | null
          max_price: number | null
          medium: string | null
          min_price: number | null
          price: number | null
          provenance: string | null
          signature_info: Json | null
          slug: string | null
          status: Database["public"]["Enums"]["artwork_status"]
          title: string | null
          updated_at: string | null
          user_id: string
          visualization_image_url: string | null
          watermarked_image_url: string | null
        }
        Insert: {
          catalogue_id?: string | null
          created_at?: string | null
          currency?: string | null
          date_info?: Json | null
          description?: string | null
          dimensions?: Json | null
          edition_info?: Json | null
          framing_info?: Json | null
          id?: string
          image_url?: string | null
          is_price_negotiable?: boolean | null
          location?: string | null
          max_price?: number | null
          medium?: string | null
          min_price?: number | null
          price?: number | null
          provenance?: string | null
          signature_info?: Json | null
          slug?: string | null
          status?: Database["public"]["Enums"]["artwork_status"]
          title?: string | null
          updated_at?: string | null
          user_id: string
          visualization_image_url?: string | null
          watermarked_image_url?: string | null
        }
        Update: {
          catalogue_id?: string | null
          created_at?: string | null
          currency?: string | null
          date_info?: Json | null
          description?: string | null
          dimensions?: Json | null
          edition_info?: Json | null
          framing_info?: Json | null
          id?: string
          image_url?: string | null
          is_price_negotiable?: boolean | null
          location?: string | null
          max_price?: number | null
          medium?: string | null
          min_price?: number | null
          price?: number | null
          provenance?: string | null
          signature_info?: Json | null
          slug?: string | null
          status?: Database["public"]["Enums"]["artwork_status"]
          title?: string | null
          updated_at?: string | null
          user_id?: string
          visualization_image_url?: string | null
          watermarked_image_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artworks_catalogue_id_fkey"
            columns: ["catalogue_id"]
            isOneToOne: false
            referencedRelation: "catalogues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artworks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogues: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          slug: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          slug?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          slug?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogues_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          artist_id: string
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          artist_id: string
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          artist_id?: string
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          artist_id: string
          artist_unread: boolean | null
          artwork_id: string
          created_at: string | null
          id: string
          inquirer_contact_number: string | null
          inquirer_email: string | null
          inquirer_name: string
          inquirer_user_id: string | null
          last_message_at: string | null
          status: string
        }
        Insert: {
          artist_id: string
          artist_unread?: boolean | null
          artwork_id: string
          created_at?: string | null
          id?: string
          inquirer_contact_number?: string | null
          inquirer_email?: string | null
          inquirer_name: string
          inquirer_user_id?: string | null
          last_message_at?: string | null
          status?: string
        }
        Update: {
          artist_id?: string
          artist_unread?: boolean | null
          artwork_id?: string
          created_at?: string | null
          id?: string
          inquirer_contact_number?: string | null
          inquirer_email?: string | null
          inquirer_name?: string
          inquirer_user_id?: string | null
          last_message_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_inquirer_user_id_fkey"
            columns: ["inquirer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: number
          sender_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: number
          sender_id?: string | null