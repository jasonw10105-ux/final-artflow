import React from "react";
import { useArtworkUploadStore } from "@/stores/artworkUploadStore";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import ColorThief from "colorthief";

type Props = {
  artworkId: string;
  onClose: () => void;
};

export default function ArtworkUploadModal({ artworkId, onClose }: Props) {
  const { images, removeImage, setPrimary, clear } = useArtworkUploadStore();

  const extractColors = async (file: File): Promise<string[]> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const ct = new ColorThief();
          const palette = ct.getPalette(img, 5);
          // convert [r,g,b] => hex
          const hexColors = palette.map(
            ([r, g, b]) =>
              "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
          );
          resolve(hexColors);
        } catch {
          resolve([]);
        }
      };
      img.onerror = () => resolve([]);
    });
  };

  const handleSave = async () => {
    try {
      let primaryColors: string[] = [];
      for (const [idx, img] of images.entries()) {
        const path = `${artworkId}/${crypto.randomUUID()}-${img.file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("artworks")
          .upload(path, img.file, { upsert: true });

        if (uploadErr) throw uploadErr;

        const publicUrl = supabase.storage.from("artworks").getPublicUrl(path).data.publicUrl;

        if (img.isPrimary) {
          // client-side fallback color extraction
          primaryColors = await extractColors(img.file);
        }

        const { error: dbErr } = await supabase.from("artwork_images").insert({
          artwork_id: artworkId,
          image_url: publicUrl,
          is_primary: img.isPrimary,
          position: idx,
        });

        if (dbErr) throw dbErr;
      }

      // Trigger intelligent metadata
      await fetch("/functions/v1/update_artwork_intelligent_metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artworkId, primaryColors }),
      });

      toast.success("Images uploaded and metadata updated.");
      clear();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    }
  };

  return (
    <div style={{ background: "#fff", padding: 24, borderRadius: 12 }}>
      <h2>Upload Images</h2>
      {images.map((img, i) => (
        <div key={img.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <img src={img.previewUrl} alt="" style={{ width: 100, height: 100, objectFit: "cover" }} />
          <button onClick={() => setPrimary(img.id)}>{img.isPrimary ? "Primary" : "Make Primary"}</button>
          <button onClick={() => removeImage(img.id)}>Remove</button>
        </div>
      ))}
      <div style={{ marginTop: 16 }}>
        <button onClick={handleSave}>Save & Update Metadata</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
