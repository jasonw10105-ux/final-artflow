import { Database } from './database.types'; // Adjust path if necessary

// --- Base Supabase Row Types (for clarity and extension) ---
type ProfileRowBase = Database['public']['Tables']['profiles']['Row'];
type ArtworkRowBase = Database['public']['Tables']['artworks']['Row'];
type ArtworkImageRowBase = Database['public']['Tables']['artwork_images']['Row'];
type CatalogueRowBase = Database['public']['Tables']['catalogues']['Row'];
type ContactRowBase = Database['public']['Tables']['contacts']['Row'];
type SalesRowBase = Database['public']['Tables']['sales']['Row'];
type InquiryRowBase = Database['public']['Tables']['inquiries']['Row'];
type TagRowBase = Database['public']['Tables']['tags']['Row'];
type ConversationRowBase = Database['public']['Tables']['conversations']['Row'];


// --- Custom App Types Extending Base Supabase Types ---

// AppProfile: Extends Supabase profiles table row with specific type refinements
export interface AppProfile extends Omit<ProfileRowBase, 'role' | 'coa_settings' | 'social_links' | 'location'> {
  // `role` can be more specific, and `undefined` if optional.
  role: ProfileRowBase['role']; // Ensure it's not undefined for core operations
  // `coa_settings` is a JSONB column, typed explicitly.
  coa_settings: { enabled: boolean; type: 'physical' | 'digital' } | null;
  // `social_links` is a JSONB array, typed explicitly.
  social_links: { platform: string; url: string; details?: string }[] | null;
  // `location` is a JSONB column, typed explicitly.
  location: LocationJson | null;
  // Add any other specific overrides or custom properties if your AppProfile differs
  avatar_url: string | null;
  website: string | null;
  contact_number: string | null;
  default_has_certificate_of_authenticity: boolean | null;
  logo_url: string | null;
  is_active: boolean; // Assuming this is part of your profiles table, ensure consistency
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  artist_statement: string | null;
  profile_completed: boolean;
  username: string | null;
  email: string;
}

// AppArtworkImage: Represents an artwork image with full details
export interface AppArtworkImage extends ArtworkImageRowBase {}

// AppArtwork: Extends Supabase artworks table row with specific type refinements and joined relations
export interface AppArtwork extends Omit<ArtworkRowBase, 
    'artist_id' | 'artwork_images' | 'dimensions' | 'framing_info' | 'signature_info' | 
    'edition_info' | 'date_info' | 'location' | 'status' | 'condition' | 'rarity' | 
    'framing_status' | 'framed_dimensions'
> {
  // Joined relations
  artist?: AppProfile | null; // The artist profile, joined.
  artwork_images?: AppArtworkImage[]; // Joined images, explicitly typed.

  // Explicit types for JSONB columns
  dimensions: DimensionsJson | null;
  framed_dimensions: DimensionsJson | null; // Add this back if it exists in your DB
  framing_info: FramingInfoJson | null;
  signature_info: SignatureInfoJson | null;
  edition_info: EditionInfoJson | null;
  date_info: DateInfoJson | null;
  location: LocationJson | null;

  // Explicit types for ENUM-like columns if they were TEXT in DB or you want stricter types
  status: 'draft' | 'available' | 'on_hold' | 'sold' | 'pending'; // Ensure all possible statuses are covered
  condition: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Restored' | 'As Is' | null;
  rarity: 'unique' | 'limited_edition' | 'open_edition' | null;
  framing_status: 'unframed' | 'framed' | 'frame_optional' | 'not_applicable' | null;

  // Optional fields for RPC results that might include them
  recommendation_reason?: string;
  rank_score?: number;

  // If artworks can have multiple catalogues, this represents the junction data
  artwork_catalogue_junction?: { catalogue: { id: string; title: string | null; slug: string | null } | null }[];
}

// AppArtworkWithJunction: Used specifically when artworks are fetched with junction table data for ordering.
export interface AppArtworkWithJunction extends AppArtwork {
  position: number;
  junction_id?: string; // The ID from the artwork_catalogue_junction table, if needed for updates.
}


// AppCatalogue: Extends Supabase catalogues table row with joined relations
export interface AppCatalogue extends Omit<CatalogueRowBase, 'user_id' | 'cover_artwork_id' | 'cover_image_url' | 'access_type' | 'password' | 'scheduled_send_at'> {
  artist?: AppProfile | null; // Joined artist profile.
  artworks?: AppArtwork[]; // Joined artworks, typically a subset.

  // Fields for wizard/editor logic
  linkedArtworks?: AppArtworkWithJunction[]; // For wizard page with position and junction_id
  linkedAudienceIds?: string[]; // For catalogue_audience_junction in wizard

  // Explicit types for ENUM-like or specific columns
  access_type: 'public' | 'password_protected' | 'restricted_audience';
  password: string | null;
  scheduled_send_at: string | null;
  cover_artwork_id: string | null;
  cover_image_url: string | null;
}

// AppContact: Extends Supabase contacts table row with joined tags
export interface AppContact extends Omit<ContactRowBase, 'address'> {
  tags: TagRow[]; // Joined tags from contact_tags and tags tables.
  address?: LocationJson | null; // Explicit type for JSONB column.
}

// AppSale: Extends Supabase sales table row with joined artwork and collector profiles
export interface AppSale extends SalesRowBase {
  artworks: AppArtwork; // Joined artwork details.
  collector?: AppProfile | null; // Joined collector profile.
}

// AppInquiry: Extends Supabase inquiries table row with joined artwork details
export interface AppInquiry extends InquiryRowBase {
  artwork: { id: string; title: string | null; slug: string | null } | null; // Simplified joined artwork
  message: string | null;
  conversation?: AppConversation | null;
}

// TagRow: Extends Supabase tags table row
export interface TagRow extends TagRowBase {}

// AppConversation: Extends Supabase conversations table row with joined data
export interface AppConversation extends ConversationRowBase {
  artwork: AppArtwork | null; // Joined artwork details
  artist?: AppProfile | null; // Joined artist profile (optional because sometimes only artist_profile is selected)
  inquirer?: AppProfile | null; // Joined inquirer profile
  artist_profile?: { slug: string | null } | null; // Simplified artist profile for joins like in inquiries
}


// --- Re-exporting JSONB types for convenience ---
export {
  type DimensionsJson,
  type FramingInfoJson,
  type SignatureInfoJson,
  type EditionInfoJson,
  type DateInfoJson,
  type LocationJson,
  type SocialLinkJson,
  type HistoricalEntryJson,
} from './database.types';