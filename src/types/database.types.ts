export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// Generic helpers
type AutoOptionalIdAndTimestamps<Row> = 'id' extends keyof Row
  ? Partial<Pick<Row, 'id' | 'created_at' | 'updated_at'>> & Omit<Row, 'id' | 'created_at' | 'updated_at'>
  : Row;

type RequiredKeys<Row> = {
  [K in keyof Row]-?: null extends Row[K] ? never : K
}[keyof Row];

type GenerateInsert<Row> = Pick<AutoOptionalIdAndTimestamps<Row>, RequiredKeys<AutoOptionalIdAndTimestamps<Row>>> & Partial<Omit<AutoOptionalIdAndTimestamps<Row>, RequiredKeys<AutoOptionalIdAndTimestamps<Row>>>>;
type GenerateUpdate<Row> = Partial<Row>;

export type Database = {
  public: {
    Tables: {
      artworks: {
        Row: {
          id: string;
          user_id: string;
          created_at: string | null;
          updated_at: string | null;
          slug: string | null;
          title: string | null;
          description: string | null;
          price: number | null;
          status: 'draft' | 'available';
          is_price_negotiable: boolean | null;
          min_price: number | null;
          max_price: number | null;
          dimensions: Json | null;
          location: string | null;
          medium: string | null;
          date_info: Json | null;
          signature_info: Json | null;
          framing_info: Json | null;
          provenance: string | null;
          currency: string | null;
          edition_info: Json | null;
          genre: string | null;
          dominant_colors: string[] | null;
          keywords: string[] | null;
        };
        Insert: GenerateInsert<Database['public']['Tables']['artworks']['Row']>;
        Update: GenerateUpdate<Database['public']['Tables']['artworks']['Row']>;
      };

      artwork_images: {
        Row: {
          id: string;
          artwork_id: string;
          image_url: string;
          watermarked_image_url: string | null;
          visualization_image_url: string | null;
          position: number;
          is_primary: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: GenerateInsert<Database['public']['Tables']['artwork_images']['Row']>;
        Update: GenerateUpdate<Database['public']['Tables']['artwork_images']['Row']>;
      };
    };
  };
};