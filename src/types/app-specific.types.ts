import {
  ArtworkRow,
  ArtworkImageRow,
  ProfileRow,
  CatalogueRow,
  NotificationRow,
  ConversationRow,
  MessageRow,
  SaleRow,
  LocationJson,
  DimensionsJson,
  DateInfoJson,
  SignatureInfoJson,
  FramingInfoJson,
  EditionInfoJson,
  HistoricalEntryJson,
  SocialLinkJson
} from './database.types';

// --- Enriched Profile Types (AppProfile) ---
export interface AppProfile extends ProfileRow {
  // Add any specific relations or computed fields you might fetch with profiles
  // e.g., follower_count, related_artworks, etc.
}

// --- Enriched Artwork Image Types (AppArtworkImage) ---
export interface AppArtworkImage extends ArtworkImageRow {
  // If artwork_images ever has further joined data, add it here.
}

// --- Enriched Artwork Types (AppArtwork) ---
export interface AppArtwork extends ArtworkRow {
  artist?: AppProfile | null; // Joined artist profile data
  artwork_images?: AppArtworkImage[]; // Joined artwork images
  // Add any other specific joined relations (e.g., 'catalogues', 'tags' etc.)
}

// --- Enriched Catalogue Types (AppCatalogue) ---
export interface AppCatalogue extends CatalogueRow {
  artist: AppProfile; // Catalogue always has an artist
  artworks?: AppArtwork[]; // Artworks joined to the catalogue
}

// --- Enriched Conversation Types (AppConversation) ---
export interface AppConversation extends ConversationRow {
  artist_profile?: AppProfile | null; // Joined artist profile
  inquirer_profile?: AppProfile | null; // Joined inquirer profile
  artwork_details?: AppArtwork | null; // Joined artwork details
  last_message_content?: string | null; // Example: last message content denormalized
}

// --- Enriched Sale Types (DetailedSale) ---
export interface DetailedSale extends SaleRow {
  artwork: {
    title: string;
    slug: string;
    image_url: string; // From primary artwork_image
    artist: { full_name: string; slug: string; } | null;
  } | null;
}

// --- Enriched Contact Type (AppContact) ---
export interface AppContact extends Database['public']['Tables']['contacts']['Row'] {
  contact_tags?: { tags: { id: string; name: string; } }[]; // Joined tags
}

// --- Common props for modals that might be used across components ---
export interface CommonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// --- Dashboard Specific Types ---
export interface ArtistDiscoveryListArtist extends AppProfile {
  follower_count: number;
  artwork_previews: { id: string; image_url: string; slug: string; }[];
}

export interface ArtistDiscoveryLists {
    rising_talent: ArtistDiscoveryListArtist[];
    trending_artists: ArtistDiscoveryListArtist[];
    personalized_suggestions: ArtistDiscoveryListArtist[];
}

// Ensure all exported types match their usage context in other files
export {
  LocationJson, DimensionsJson, DateInfoJson, SignatureInfoJson, FramingInfoJson,
  EditionInfoJson, HistoricalEntryJson, SocialLinkJson
};