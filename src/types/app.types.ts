// src/types/app.types.ts
import { Database } from './database.types'; // Assuming database.types.ts is in the same directory

// Export ProfileRow directly from Database types for clarity
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

// AppProfile: Extends ProfileRow with any app-specific fields or relations if needed
// Adding coa_settings from ArtistSettingsPage for consistency
export interface AppProfile extends ProfileRow {
    coa_settings?: { enabled: boolean; type: 'physical' | 'digital'; } | null;
    // Add any specific relations or computed fields you might fetch with profiles
    email?: string; // Often included in profile context from auth user
    profile_completed?: boolean; // From auth context, useful for initial checks
    role?: 'artist' | 'collector' | 'both' | null; // From auth context, useful for role guards
}

// AppArtworkImage: Extends the raw ArtworkImageRow
export type AppArtworkImage = Database['public']['Tables']['artwork_images']['Row'];

// AppArtwork: Extends the raw ArtworkRow with common joined relations
// This type needs to be flexible enough for various joins (full, partial)
export interface AppArtwork extends Database['public']['Tables']['artworks']['Row'] {
  artist?: AppProfile | null; // Joined artist profile data
  artwork_images?: AppArtworkImage[]; // Joined artwork images
  
  // For RPC outputs like get_personalized_artworks or others, some fields might be minimal
  artist_id?: string; // Denormalized artist ID if RPC returns it separately
  artist_full_name?: string; // Denormalized artist name
  artist_slug?: string; // Denormalized artist slug

  // Specific to dashboard/artist ArtworkListPage
  artwork_catalogue_junction?: { catalogue: CatalogueRef | null }[]; // For ArtworkListPage
}

// AppSale type from SalesPage.tsx and CollectorSalesPage.tsx
export interface AppSale extends Database['public']['Tables']['sales']['Row'] {
    artworks: { // Assuming a simplified artwork object in sales context
        id: string;
        title: string | null;
        slug: string | null;
        image_url: string | null; // Primary image URL
    };
    collector: { // Assuming a simplified collector profile in sales context
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
    artwork: { // Simplified artwork in inquiry context
        id: string;
        title: string | null;
        slug: string | null;
    } | null;
    // Adding message content for inquiry preview if needed
    message?: string;
    conversation_id?: string; // For linking to full conversation
    inquirer_email?: string; // From inquiries table direct select
}

// CatalogueRef for artwork_catalogue_junction in ArtworkListPage.tsx
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

// New types needed for various dashboard components as identified by errors
// From ArtworkUploadStore
export interface ArtworkUploadState {
    files: File[];
    isUploading: boolean;
    uploadProgress: number;
    uploadedArtworkIds: string[];
    addFiles: (newFiles: File[]) => void;
    clearStore: () => void;
    reset: () => void;
    setArtworkId: (id: string | undefined) => void; // artworkId can be undefined for new
    addArtworkId: (id: string) => void;
}

// For ArtworkUploadModal
export interface ArtworkUploadModalProps {
    isOpen: boolean; // Assuming this prop exists to control visibility
    onClose: () => void;
    onUploadComplete: (artworkIds: string[]) => void;
}

// For ArtworkForm (simplified, as ArtworkForm.tsx will be fully updated)
export interface ArtworkFormProps {
    artworkId?: string; // Optional for new artwork
    onSaveSuccess: () => void;
}

// For ArtworkEditorForm (specific version of ArtworkForm used for editing)
export interface ArtworkEditorFormProps {
    artworkId: string; // Required for editing
    onSaveSuccess: (newId: string) => void; // New artworkId for redirects
}

// For ImageUpload (from ArtistSettingsPage)
export interface ImageUploadProps {
    label: string;
    onFileSelect: React.Dispatch<React.SetStateAction<File | null>>;
    initialPreview?: string | null;
}

// For ShareButton (reusing AppArtwork type for content, but defining props explicitly)
export interface ShareButtonProps {
    isOpen: boolean; // Added isOpen prop for consistency with other modals
    onClose: () => void; // Added onClose prop
    shareUrl: string;
    title: string | null | undefined;
    byline: string | null | undefined; // Artist name or collector name
    previewImageUrls: (string | null | undefined)[]; // Allow null/undefined in array
    isCatalogue?: boolean;
    artwork?: AppArtwork; // Full artwork object if sharing an artwork
    dimensions?: string | null; // Added for share modal
    price?: number | null; // Added for share modal
    year?: string | null; // Added for share modal
    currency?: string | null; // Added for share modal
}

// For ArtworkReactionButtons (reusing AppArtwork type for content, but defining props explicitly)
export interface ArtworkReactionButtonsProps {
    artworkId: string;
    initialReaction: 'like' | 'dislike' | null;
}

// For StoredArtwork in useRecentlyViewed (from CollectorDashboardPage)
export interface StoredArtwork {
  id: string;
  title: string | null;
  slug: string | null;
  image_url: string | null | undefined;
  artist_slug: string | null | undefined;
}

// For Collector Pages data fetching
export interface DetailedSale extends Database['public']['Tables']['sales']['Row'] {
    artwork: (Database['public']['Tables']['artworks']['Row'] & {
        images: { image_url: string; position: number; }[] | null; // For selecting images
        artist: ProfileRow | null; // For selecting artist details
        image_url?: string; // Denormalized primary image URL for convenience
    }) | null;
}


// From CollectorInquiriesPage
export interface DetailedConversation extends Database['public']['Tables']['conversations']['Row'] {
    artworks: Pick<Database['public']['Tables']['artworks']['Row'], 'title' | 'slug' | 'user_id'> | null;
    artist_profile: Pick<Database['public']['Tables']['profiles']['Row'], 'slug'> | null;
    inquirer_name?: string; // Added for MessagingCenterPage
    is_blocked?: boolean; // Added for MessagingCenterPage
    last_message_at?: string; // Added for MessagingCenterPage
    artist_unread?: boolean; // Added for MessagingCenterPage
    inquirer_id?: string; // Added for Blocking logic
    message?: string; // Added for inquiry preview
}

// From CollectorSettingsPage (UserPreferences)
export interface NotificationEntityTypeSettings {
    artwork: boolean;
    artist: boolean;
    catalogue: boolean;
}

export interface LearnedBudgetRange {
    min: number;
    max: number;
    confidence?: string;
}

export interface LearnedPreferences {
    top_liked_mediums?: { name: string; count: number }[];
    top_liked_styles?: { name: string; count: number }[];
    preferred_price_range_from_behavior?: LearnedBudgetRange;
    overall_engagement_score?: number;
    negative_preferences?: {
        disliked_mediums?: string[];
        disliked_styles?: string[];
    };
    top_followed_artists?: { artist_id: string; full_name: string }[];
    last_learned_update?: string;
    [key: string]: any; // Allow other dynamic properties
}

export interface UserPreferences extends Database['public']['Tables']['user_preferences']['Row'] {
    // Explicitly redefine complex JSONB types to ensure correct inference/usage
    learned_preferences: LearnedPreferences | null;
    notification_real_time: NotificationEntityTypeSettings | null;
    notification_daily: NotificationEntityTypeSettings | null;
    notification_weekly: NotificationEntityTypeSettings | null;
}

// From ArtistInsightsRPCResult (if not already in database.types.ts)
export interface ArtistInsightsRPCResult {
  profileViews: number | null;
  previousProfileViews: number | null;
  artworkViews: number | null;
  previousArtworkViews: number | null;
  inquiries: number | null;
  previousInquiries: number | null;
  followers: {created_at: string}[]; // Simplified
  previousFollowersCount: number | null;
  sales: {id: string, artwork_id: string, collector_id: string, sale_price: number, sale_date: string, genre: string}[]; // Simplified
  previousSalesCount: number | null;
  previousTotalRevenue: number | null;
  shares: {created_at: string}[]; // Simplified
  trendingArtworks: {id: string, title: string, score: number}[]; // Simplified
  collectorStats: {id: string, purchases: number}[]; // Simplified
}