import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { ArtworkImageRow } from '@/types/database.types'; // Correct import for direct Row type

// Use the directly exported ArtworkImageRow type
interface ArtworkImage extends ArtworkImageRow {
  // is_primary is part of the DB type
  // watermarked_image_url and visualization_image_url are also part of the DB type
}

interface SortableImageProps {
  image: ArtworkImage;
  onDelete: (id: string) => void;
  onReplace: (id: string, file: File) => void;
  onSetPrimary: (id: string) => void;
  isReplacing: boolean;
}

const SortableImage: React.FC<SortableImageProps> = ({ image, onDelete, onReplace, onSetPrimary, isReplacing }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition: sortableTransition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: sortableTransition,
    zIndex: isDragging ? 10 : 0,
    opacity: isDragging ? 0.8 : 1,
    position: 'relative',
    height: '150px', // Fixed height for consistency in grid
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div ref={setNodeRef} style={style}>
      <div className="relative group w-full h-full overflow-hidden rounded-lg border border-gray-200">
        {isReplacing ? (
          <div className="flex items-center justify-center w-full h-full bg-gray-100 text-gray-500">
            Replacing...
          </div>
        ) : (
          <img
            src={image.image_url} // Always show original in dashboard edit view
            alt={`Artwork ${image.position}`}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity space-y-2">
          <button
            type="button"
            onClick={() => onDelete(image.id)}
            className="text-white bg-red-600 hover:bg-red-700 text-xs px-2 py-1 rounded-md"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-white bg-yellow-600 hover:bg-yellow-700 text-xs px-2 py-1 rounded-md"
          >
            Replace
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onReplace(image.id, e.target.files[0]);
                e.target.value = ''; // Reset file input
              }
            }}
            style={{ display: 'none' }}
            accept="image/*"
          />
          <button
            type="button"
            onClick={() => onSetPrimary(image.id)}
            className={`text-white text-xs px-2 py-1 rounded-md ${image.is_primary ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            disabled={image.is_primary}
          >
            {image.is_primary ? 'Primary' : 'Set as Primary'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SortableImage;