import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import ArtworkUploadModal from "@/components/dashboard/ArtworkUploadModal";
import { useArtworkUploadStore } from "@/stores/artworkUploadStore";

export default function ArtworkWizardPage() {
  const { reset, artworkId } = useArtworkUploadStore();
  const [uploadOpen, setUploadOpen] = useState(true);

  const createArtwork = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("artworks")
        .insert({ title: "Untitled Artwork", status: "draft" })
        .select("id")
        .single();

      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      useArtworkUploadStore.getState().setArtworkId(id);
      toast.success("New artwork created");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSave = async () => {
    if (!artworkId) return;

    const res = await fetch("/functions/v1/update_artwork_intelligent_metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artworkId }),
    });

    if (!res.ok) {
      const err = await res.json();
      toast.error(`Metadata update failed: ${err.error}`);
    } else {
      toast.success("Artwork saved with intelligent metadata!");
      reset();
      setUploadOpen(false);
    }
  };

  return (
    <div style={{ padding: 32 }}>
      <h1>Create Artwork</h1>
      {!artworkId ? (
        <button
          onClick={() => createArtwork.mutate()}
          disabled={createArtwork.isLoading}
        >
          {createArtwork.isLoading ? "Creating..." : "Start New Artwork"}
        </button>
      ) : (
        <>
          <ArtworkUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
          <button
            onClick={handleSave}
            style={{ marginTop: 16, background: "#000", color: "#fff", padding: "8px 16px" }}
          >
            Save Artwork
          </button>
        </>
      )}
    </div>
  );
}
