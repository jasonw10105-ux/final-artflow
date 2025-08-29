import React, { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthProvider";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ArtworkUploadModal from "@/components/dashboard/ArtworkUploadModal";

export default function ArtworkWizardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [artworkId, setArtworkId] = useState<string | null>(null);
  const [step, setStep] = useState<"primary" | "additional">("primary");

  // Auto-create Untitled Artwork
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("artworks")
        .insert({
          user_id: user.id,
          title: "Untitled Artwork",
          status: "Pending",
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      return data.id as string;
    },
    onSuccess: (id) => setArtworkId(id),
    onError: (err: any) => toast.error(err.message ?? "Failed to create artwork"),
  });

  useEffect(() => {
    if (!artworkId) createMutation.mutate();
  }, [artworkId, createMutation]);

  const handlePrimaryUploadComplete = async (uploadedIds: string[]) => {
    if (!artworkId) return;

    try {
      // Trigger intelligent metadata update via Supabase RPC
      const { error } = await supabase.rpc("update_artwork_intelligent_metadata", {
        artwork_id: artworkId,
        primary_image_id: uploadedIds[0],
      });
      if (error) throw new Error(error.message);

      toast.success("Primary image uploaded and metadata updated");
      setStep("additional");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update intelligent metadata");
    }
  };

  const handleAdditionalUploadComplete = async (uploadedIds: string[]) => {
    toast.success(`Uploaded ${uploadedIds.length} additional images`);
  };

  const handleCreateMore = () => {
    setStep("primary");
    setArtworkId(null);
  };

  if (!artworkId) return <p>Initializing artwork wizard…</p>;

  return (
    <div>
      {step === "primary" && (
        <ArtworkUploadModal primaryOnly onUploadComplete={handlePrimaryUploadComplete} />
      )}

      {step === "additional" && (
        <>
          <ArtworkUploadModal primaryOnly={false} onUploadComplete={handleAdditionalUploadComplete} maxFiles={4} />
          <div style={{ marginTop: "16px", display: "flex", justifyContent: "center" }}>
            <button className="button button-secondary" onClick={handleCreateMore}>
              Create Another Artwork
            </button>
          </div>
        </>
      )}
    </div>
  );
}
