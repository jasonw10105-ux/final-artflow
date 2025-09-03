// src/components/ui/ArtworkReactionButtons.tsx
import React, { useState, useCallback } from 'react';
import { Heart, Share2, MessageCircle, HeartCrack } from 'lucide-react';
import toast from 'react-hot-toast'; // Assuming you use react-hot-toast for notifications
import { supabase } from '@/lib/supabaseClient'; // Assuming Supabase for backend interactions
import { useAuth } from '@/contexts/AuthProvider'; // Assuming an AuthProvider for user context

interface ArtworkReactionButtonsProps {
  artworkId: string;
  initialLikesCount?: number;
  initialUserLiked?: boolean;
  onLikeToggle?: (newLikedStatus: boolean, newLikesCount: number) => void;
  // You can add props for sharing functionality, comment counts, etc.
}

const ArtworkReactionButtons: React.FC<ArtworkReactionButtonsProps> = ({
  artworkId,
  initialLikesCount = 0,
  initialUserLiked = false,
  onLikeToggle,
}) => {
  const { user } = useAuth();
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [userLiked, setUserLiked] = useState(initialUserLiked);
  const [isLiking, setIsLiking] = useState(false); // To prevent multiple rapid clicks

  // Effect to update internal state if props change (e.g., initial data loaded or refreshed)
  React.useEffect(() => {
    setLikesCount(initialLikesCount);
    setUserLiked(initialUserLiked);
  }, [initialLikesCount, initialUserLiked]);

  const handleLikeToggle = useCallback(async () => {
    if (!user) {
      toast.error("You need to be logged in to react to artworks.");
      return;
    }
    if (isLiking) return; // Prevent multiple requests

    setIsLiking(true);
    const newLikedStatus = !userLiked;
    const newLikes = newLikedStatus ? likesCount + 1 : likesCount - 1;

    // Optimistically update UI
    setUserLiked(newLikedStatus);
    setLikesCount(newLikes);

    try {
      if (newLikedStatus) {
        // User liked: Insert a new reaction
        const { error } = await supabase
          .from('artwork_reactions')
          .insert({ artwork_id: artworkId, user_id: user.id, type: 'like' });

        if (error) throw error;
        toast.success("Artwork liked!");
      } else {
        // User unliked: Delete the reaction
        const { error } = await supabase
          .from('artwork_reactions')
          .delete()
          .eq('artwork_id', artworkId)
          .eq('user_id', user.id)
          .eq('type', 'like');

        if (error) throw error;
        toast.success("Artwork unliked!");
      }

      // If there's an external callback, inform it of the change
      onLikeToggle?.(newLikedStatus, newLikes);

    } catch (error: any) {
      console.error("Error toggling like:", error.message);
      toast.error(`Failed to ${newLikedStatus ? 'like' : 'unlike'} artwork: ${error.message}`);
      // Revert UI on error
      setUserLiked(!newLikedStatus);
      setLikesCount(!newLikedStatus ? likesCount + 1 : likesCount - 1);
    } finally {
      setIsLiking(false);
    }
  }, [user, artworkId, userLiked, likesCount, onLikeToggle, isLiking]);

  const handleShare = useCallback(() => {
    // Implement sharing logic here
    // For example, copy link to clipboard or open a share dialog
    const shareUrl = `${window.location.origin}/artwork/${artworkId}`; // Example URL
    navigator.clipboard.writeText(shareUrl)
      .then(() => toast.success("Artwork link copied to clipboard!"))
      .catch((err) => {
        console.error("Failed to copy link:", err);
        toast.error("Failed to copy link.");
      });
  }, [artworkId]);

  const handleComment = useCallback(() => {
    // This could navigate to the artwork detail page with comments section open,
    // or trigger a comment modal/sidebar.
    toast.info("Comment feature is coming soon!");
    // navigate(`/artwork/${artworkId}#comments`);
  }, []);


  return (
    <div className="flex items-center gap-4 text-muted-foreground">
      <button
        onClick={handleLikeToggle}
        disabled={isLiking}
        className={`flex items-center gap-1 p-2 rounded-full transition-colors duration-200
          ${userLiked ? 'text-red-500 hover:bg-red-50' : 'hover:bg-gray-100'}
          ${isLiking ? 'cursor-not-allowed opacity-70' : ''}`}
        title={userLiked ? "Unlike" : "Like"}
      >
        {userLiked ? <Heart fill="currentColor" size={20} /> : <Heart size={20} />}
        <span className="text-sm font-medium">{likesCount}</span>
      </button>

      <button
        onClick={handleShare}
        className="flex items-center gap-1 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
        title="Share"
      >
        <Share2 size={20} />
      </button>

      {/* Optionally add a comment button if you have a commenting system */}
      {/* <button
        onClick={handleComment}
        className="flex items-center gap-1 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
        title="Comments"
      >
        <MessageCircle size={20} />
        <span className="text-sm font-medium">0</span> // Replace with actual comment count
      </button> */}
    </div>
  );
};

export default ArtworkReactionButtons;