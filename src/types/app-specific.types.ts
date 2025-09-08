import { AppProfile, AppArtwork, AppContact, TagRow, AppConversation, DimensionsJson } from '@/types/app.types'; // Import from central types

// ArtistInsightsRPCResult: Specific to the artist_insights RPC return
export interface ArtistInsightsRPCResult {
  profileViews: number | null;
  previousProfileViews: number | null;
  artworkViews: number | null;
  previousArtworkViews: number | null;
  inquiries: number | null;
  previousInquiries: number | null;
  sales: {
    id: string;
    artwork_id: string;
    collector_id: string;
    sale_price: number;
    sale_date: string;
    genre: string | null;
  }[] | null;
  previousTotalRevenue: number | null;
  previousSalesCount: number | null;
  followers: { created_at: string }[] | null; // Simplified for insights
  previousFollowersCount: number | null;
  shares: { created_at: string }[] | null; // Simplified for insights
  collectorStats: { collector_id: string; purchases: number }[] | null;
  trendingArtworks: { id: string; title: string; score: number }[] | null;
  // Add other properties that your RPC might return, e.g., AI recommendations, etc.
}

// MarketTrends: Specific to the get_collector_market_trends RPC
export interface MarketTrends {
    top_mediums: { name: string; count: number; }[];
    top_styles: { name: string; count: number; }[];
    price_brackets: { bracket: string; activity_count: number; }[];
}

// For recent activity widget, if it has its own simplified types
export interface RecentInquiry {
  id: string;
  inquirer_name: string;
  artwork_id: string | null; // Ensure this is from DB
  artworks: { title: string | null } | null;
  created_at?: string; // Add created_at for sorting
}

export interface RecentSale {
  id: string;
  sale_price: number | null;
  currency: string | null;
  collector: { full_name: string | null } | null;
  artwork_id: string | null; // Ensure this is from DB
  artworks: { title: string | null } | null;
  sale_date: string; // Add sale_date for sorting
}

// This interface is for the props of the reusable ShareButton
// Note: It combines elements previously spread in the original ShareModal
// which simplifies handling.
export interface ShareButtonProps {
    url?: string; // The URL to share. Defaults to window.location.href.
    title?: string; // The title of the content being shared.
    text?: string; // The text/description to share.
    className?: string; // Optional: additional CSS classes for the button.
    buttonText?: string; // Optional: text to display inside the button.
    iconOnly?: boolean;
    // Props specific for triggering a modal
    isOpen: boolean;
    onClose: () => void;
    shareUrl: string;
    byline?: string | null;
    previewImageUrls: (string | null)[];
    isCatalogue?: boolean;
    artwork?: AppArtwork; // Pass the whole artwork for more context
    dimensions?: string; // Formatted dimensions string
    price?: number | null;
    year?: string | null;
    currency?: string | null;
}

// For ArtworkUploadModalProps (used in ArtworkWizardPage & ArtistDashboardPage)
export interface ArtworkUploadModalProps {
    isOpen: boolean; // Corrected from 'open' to 'isOpen' for consistency
    onClose: () => void;
    artworkId: string;
    onUploadComplete?: (artworkIds: string[]) => void; // For batch upload success
}