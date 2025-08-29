export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type OptionalId<T extends { id: any }> = Omit<Partial<T>, 'id'>;

// Generic helpers
type Insert<Row extends { id: any }, RequiredKeys extends keyof Row = never> = OptionalId<Row> & Pick<Row, RequiredKeys>;
type Update<Row extends { id: any }> = Partial<Row>;

export type Database = {
  public: {
    Tables: {
      artworks: {
        Row: {
          id: string;
          user_id: string;
          created_at: string | null;
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
          updated_at: string | null;
          edition_info: Json | null;
          genre: string | null;
          dominant_colors: string[] | null;
          keywords: string[] | null;
        };
        Insert: Insert<Database['public']['Tables']['artworks']['Row'], 'user_id'>;
        Update: Update<Database['public']['Tables']['artworks']['Row']>;
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
        };
        Insert: Insert<Database['public']['Tables']['artwork_images']['Row'], 'artwork_id' | 'image_url' | 'position'>;
        Update: Update<Database['public']['Tables']['artwork_images']['Row']>;
      };
    };
  };
};
