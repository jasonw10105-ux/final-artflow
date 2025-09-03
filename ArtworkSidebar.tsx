// src/components/dashboard/ArtworkSidebar.tsx
import React from "react";
import { useArtworkUploadStore } from "@/stores/artworkUploadStore";
import toast from "react-hot-toast";

interface ArtworkSidebarProps {
  onSelectArtwork: (id: string) => void;
  artworks: { id: string; title: string }[];
}

export default function ArtworkSidebar({ onSelectArtwork, artworks }: ArtworkSidebarProps) {
  const { addArtworkId } = useArtworkUploadStore();

  const handleAddArtwork = async () => {
    try {
      // Create a draft artwork
      const res = await fetch("/functions/v1/create_draft_artwork", {
        method: "POST",
      });
      const data = await res.json();
      const newId = data.id;
      addArtworkId(newId);
      onSelectArtwork(newId);
      toast.success("Draft artwork created!");
    } catch (err: any) {
      toast.error(err.message || "Failed to create artwork");
    }
  };

  return (
    <div className="w-64 border-r p-4 flex flex-col gap-4">
      <button
        onClick={handleAddArtwork}
        className="bg-black text-white px-4 py-2 rounded"
      >
        + Add Artwork
      </button>
      <div className="flex flex-col gap-2 mt-4">
        {artworks.map((a) => (
          <button
            key={a.id}
            className="text-left px-2 py-1 hover:bg-gray-100 rounded"
            onClick={() => onSelectArtwork(a.id)}
          >
            {a.title || "Untitled"}
          </button>
        ))}
      </div>
    </div>
  );
}