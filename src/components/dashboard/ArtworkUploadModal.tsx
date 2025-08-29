import React from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { useArtworkUploadStore } from "@/stores/artworkUploadStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ArtworkUploadModal({ open, onClose }: Props) {
  const { artworkId, setPrimaryImage, addAdditionalImage } = useArtworkUploadStore();

  const onDropPrimary = async (files: File[]) => {
    if (!artworkId || !files.length) return;
    const file = files[0];

    const { data, error } = await supabase.storage
      .from("artwork-images")
      .upload(`${artworkId}/primary-${Date.now()}`, file, { upsert: true });

    if (error) {
      toast.error(error.message);
      return;
    }

    const url = supabase.storage.from("artwork-images").getPublicUrl(data.path).data.publicUrl;

    await supabase.from("artwork_images").insert({
      artwork_id: artworkId,
      image_url: url,
      is_primary: true,
      position: 0,
    });

    setPrimaryImage(url);
    toast.success("Primary image uploaded");
  };

  const onDropAdditional = async (files: File[]) => {
    if (!artworkId) return;

    for (const file of files) {
      const { data, error } = await supabase.storage
        .from("artwork-images")
        .upload(`${artworkId}/additional-${Date.now()}`, file, { upsert: true });

      if (error) {
        toast.error(error.message);
        continue;
      }

      const url = supabase.storage.from("artwork-images").getPublicUrl(data.path).data.publicUrl;

      await supabase.from("artwork_images").insert({
        artwork_id: artworkId,
        image_url: url,
        is_primary: false,
      });

      addAdditionalImage(url);
    }

    toast.success("Additional images uploaded");
  };

  const { getRootProps: getPrimaryProps, getInputProps: getPrimaryInput } = useDropzone({
    onDrop: onDropPrimary,
    multiple: false,
  });

  const { getRootProps: getAdditionalProps, getInputProps: getAdditionalInput } = useDropzone({
    onDrop: onDropAdditional,
    multiple: true,
    maxFiles: 4,
  });

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 100,
      }}
    >
      <div style={{ background: "#fff", padding: 24, borderRadius: 12, width: 500 }}>
        <h2>Upload Artwork Images</h2>

        <div {...getPrimaryProps()} style={{ border: "2px dashed #aaa", padding: 24, marginTop: 16 }}>
          <input {...getPrimaryInput()} />
          <p>Drag & drop a primary image here, or click to select</p>
        </div>

        <div {...getAdditionalProps()} style={{ border: "2px dashed #aaa", padding: 24, marginTop: 16 }}>
          <input {...getAdditionalInput()} />
          <p>Drag & drop up to 4 additional images here</p>
        </div>

        <button onClick={onClose} style={{ marginTop: 16 }}>
          Done
        </button>
      </div>
    </div>
  );
}
