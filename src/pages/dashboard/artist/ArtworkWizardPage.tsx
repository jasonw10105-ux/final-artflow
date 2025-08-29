import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import ArtworkUploadModal from "./ArtworkUploadModal";

export default function ArtworkWizardPage() {
  const { user } = useAuth();
  const [artworkId, setArtworkId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(true);

  const createUntitledArtwork = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("artworks")
      .insert({ title: "Untitled Artwork", user_id: user.id, status: "Pending" })
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }
    setArtworkId(data.id);
    setShowUpload(true);
  };

  const handleUploadComplete = async (uploadedIds: string[]) => {
    if (!artworkId) return;

    try {
      // Call RPC for intelligent metadata update
      const { error } = await supabase.rpc("update_artwork_intelligent_metadata", { artwork_uuid: artworkId });
      if (error) throw error;
      toast.success("Artwork saved with intelligent metadata!");
      setShowUpload(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update metadata");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Artwork Wizard</h1>

      {!artworkId && (
        <button className="button-primary" onClick={createUntitledArtwork}>
          Create New Artwork
        </button>
      )}

      {showUpload && artworkId && (
        <ArtworkUploadModal onUploadComplete={handleUploadComplete} />
      )}

      {!showUpload && (
        <div>
          <p>Artwork created successfully!</p>
          <button className="button-secondary" onClick={createUntitledArtwork}>
            + Create Another Artwork
          </button>
        </div>
      )}
    </div>
  );
}
