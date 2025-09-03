// src/components/ui/ShareButton.tsx
import React, { useCallback, useState } from 'react';
import { Share2 } from 'lucide-react'; // Assuming you have lucide-react for icons
import toast from 'react-hot-toast'; // Assuming you use react-hot-toast for notifications

interface ShareButtonProps {
  /** The URL to share. Defaults to window.location.href. */
  url?: string;
  /** The title of the content being shared. */
  title?: string;
  /** The text/description to share. */
  text?: string;
  /** Optional: additional CSS classes for the button. */
  className?: string;
  /** Optional: text to display inside the button. */
  buttonText?: string;
  /** Optional: whether to show only the icon. */
  iconOnly?: boolean;
}

const ShareButton: React.FC<ShareButtonProps> = ({
  url,
  title = document.title, // Default to current document title
  text = '',
  className = '',
  buttonText = 'Share',
  iconOnly = false,
}) => {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = useCallback(async (event: React.MouseEvent) => {
    event.preventDefault(); // Prevent default button action if any
    setIsSharing(true);
    
    const shareUrl = url || window.location.href;

    // Check if the Web Share API is available
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
          url: shareUrl,
        });
        toast.success('Content shared successfully!');
      } catch (error: any) {
        // User cancelled share or there was an error
        if (error.name !== 'AbortError') { // Ignore user cancelling
          console.error('Error sharing:', error);
          toast.error(`Failed to share: ${error.message || 'Unknown error'}`);
        }
      }
    } else {
      // Fallback: Copy URL to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
      } catch (error: any) {
        console.error('Error copying to clipboard:', error);
        toast.error('Failed to copy link.');
      }
    }
    setIsSharing(false);
  }, [url, title, text]);

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className={`button button-secondary flex items-center justify-center gap-2 ${className}`}
      title={buttonText}
      aria-label={buttonText}
    >
      <Share2 size={16} />
      {!iconOnly && <span className="text-sm">{isSharing ? 'Sharing...' : buttonText}</span>}
    </button>
  );
};

export default ShareButton;