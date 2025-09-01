import React from "react";
import { Trash2, Edit, Move } from "lucide-react"; // These are correct for lucide-react
import { Star, StarBorder } from "@mui/icons-material"; // <-- CORRECTED IMPORT for Star/StarBorder
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconButton } from "@mui/material"; // Assuming you have MUI IconButton

interface ArtworkImage {
  id: string;
  image_url: string;
  position: number;
}

interface SortableImageProps {
  image: ArtworkImage;
  onDelete: (id: string) => void;
  onReplace: (id: string, file: File) => void;
  onSetPrimary: (id: string) => void;
  isPrimary: boolean;
}

export default function SortableImage({ image, onDelete, onReplace, onSetPrimary, isPrimary }: SortableImageProps) {
  // `disabled: isPrimary` ensures primary image is not draggable by DndContext
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id, disabled: isPrimary });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    border: isPrimary ? "2px solid #3f51b5" : "1px solid #e0e0e0", // Highlight primary
    borderRadius: 8,
    padding: 8,
    background: '#fff',
    opacity: isDragging ? 0.7 : 1, // Slightly reduce opacity when dragging
    zIndex: isDragging ? 1000 : 0,
    boxShadow: isDragging ? '0px 4px 8px rgba(0,0,0,0.1)' : 'none',
    cursor: isPrimary ? "default" : "grab", // Primary is not directly draggable by its image area
    touchAction: isPrimary ? "none" : "manipulation", // Prevent default touch actions for draggable
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onReplace(image.id, e.target.files[0]);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="relative flex flex-col items-center gap-2">
      <img src={image.image_url} alt="Artwork" className="w-full h-32 object-cover rounded" />

      {/* Drag Handle (only for non-primary images, and separated from image click) */}
      {/* attributes and listeners are placed here to make only this area draggable for non-primary images */}
      {!isPrimary && (
        <IconButton {...listeners} {...attributes} size="small" style={{ position: 'absolute', top: 4, left: 4, cursor: 'grab' }}>
          <Move size={18} />
        </IconButton>
      )}

      <div className="absolute top-1 right-1 flex gap-1">
        {/* Set Primary Button */}
        <IconButton size="small" onClick={() => onSetPrimary(image.id)} color={isPrimary ? "primary" : "default"}>
          {isPrimary ? <Star /> : <StarBorder />}
        </IconButton>

        {/* Delete Button (not for primary, unless it's the only image) */}
        {!isPrimary && ( // If it's not primary, allow deleting
          <IconButton size="small" onClick={() => onDelete(image.id)} color="error">
            <Trash2 size={16} />
          </IconButton>
        )}
      </div>
      
      {/* Replace File Input (always present) */}
      <label htmlFor={`replace-file-${image.id}`} className="cursor-pointer text-blue-500 flex items-center gap-1 text-sm">
        <Edit size={16} /> Replace
        <input
          id={`replace-file-${image.id}`}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>

      {isPrimary && <span className="absolute bottom-1 right-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">Primary</span>}
    </div>
  );
}