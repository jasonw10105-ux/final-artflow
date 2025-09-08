// src/types/app.types.ts
import { Database } from './database.types'; // Assuming database.types.ts is in the same directory

// Export ProfileRow directly from Database types for clarity
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

// AppProfile: Extends ProfileRow with any app-specific fields or relations if needed
export interface AppProfile extends ProfileRow {
    // Add any specific relations or computed fields you might fetch with profiles
}

// AppArtworkImage: Extends the raw ArtworkImageRow
export type AppArtworkImage = Database['public']['Tables']['artwork_images']['Row'];


// AppArtwork: Extends the raw ArtworkRow with common joined relations
export interface AppArtwork extends Database['public']['Tables']['artworks']['Row'] {
  artist?: AppProfile | null; // Joined artist profile data
  artwork_images?: AppArtworkImage[]; // Joined artwork images
  // Add any other specific joined relations (e.g., 'catalogues', 'tags' etc.)

  // For RPC outputs like get_personalized_artworks, some fields might be minimal
  // These are optional to allow RPCs to return partial profiles
  artist_id?: string;
  artist_full_name?: string;
  artist_slug?: string;
}

// AppSale type from SalesPage.tsx
export interface AppSale extends Database['public']['Tables']['sales']['Row'] {
    artworks: {
        id: string;
        title: string | null;
        slug: string | null;
        image_url: string | null;
    };
    collector: {
        id: string;
        full_name: string | null;
        slug: string | null;
    } | null;
}

// AppContact type from ContactEditorPage.tsx and ContactListPage.tsx
export interface AppContact extends Database['public']['Tables']['contacts']['Row'] {
    tags: { id: string; name: string }[];
}

// TagRow type from ContactEditorPage.tsx and ContactListPage.tsx
export type TagRow = Database['public']['Tables']['tags']['Row'];


// AppInquiry type from ContactEditorPage.tsx
export interface AppInquiry extends Database['public']['Tables']['inquiries']['Row'] {
    artwork: {
        id: string;
        title: string | null;
        slug: string | null;
    } | null;
}

// CatalogueRef for artwork_catalogue_junction
export type CatalogueRef = {
    id: string;
    title: string | null;
    slug: string | null;
};

// CatalogueWithCounts from CatalogueListPage.tsx
export type CatalogueWithCounts = Database['public']['Tables']['catalogues']['Row'] & {
    total_count: number; available_count: number; sold_count: number;
};

// AppCatalogue from CatalogueWizardPage.tsx and PublicCataloguePage.tsx
export interface AppCatalogue extends Database['public']['Tables']['catalogues']['Row'] {
  artist: AppProfile; // Or a more minimal profile type if only slug/name is fetched
  artworks?: AppArtwork[]; // For PublicCataloguePage
  linkedArtworks?: (AppArtwork & { position: number; junction_id: string; })[]; // For CatalogueWizardPage
  linkedAudienceIds?: string[]; // For CatalogueWizardPage
}