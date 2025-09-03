import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/lib/supabaseClient";
import { useArtworkUploadStore } from "@/stores/artworkUploadStore"; // Assuming this store exists
import toast from "react-hot-toast";

interface ArtworkUploadModalProps {
  open: boolean;
  onClose: () => void;
  artworkId: string;
  // If you need to trigger a re-fetch on the ArtworkForm after an image is uploaded and primary_image_url is set,
  // you might want to add an onUploadSuccess prop here:
  // onUploadComplete?: (artworkId: string, primaryImageUrl: string) => void;
}

export default function ArtworkUploadModal({ open, onClose, artworkId }: ArtworkUploadModalProps) {
  const { addImages } = useArtworkUploadStore(); // Assuming addImages takes ArtworkImageRow[]
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".png", ".jpg", ".gif"] },
    multiple: true,
  });

  const handleUpload = async () => {
    if (!files.length) return toast.error("No files to upload");
    setUploading(true);

    try {
      const uploadedImages = [];
      let isFirstImage = false;

      // Check if this artwork currently has no images
      const { data: existingImages, error: fetchErr } = await supabase
        .from('artwork_images')
        .select('id')
        .eq('artwork_id', artworkId);

      if (fetchErr) throw fetchErr;
      if (!existingImages || existingImages.length === 0) {
        isFirstImage = true;
      }

      for (const file of files) {
        const path = `${artworkId}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("artworks")
          .upload(path, file, { upsert: true });

        if (uploadErr) throw uploadErr;

        const publicUrl = supabase.storage.from("artworks").getPublicUrl(path).data.publicUrl;

        // Insert new artwork_image record
        const { data, error: dbErr } = await supabase.from("artwork_images").insert({
          artwork_id: artworkId,
          image_url: publicUrl,
          position: isFirstImage ? 0 : undefined,
          is_primary: isFirstImage ? true : undefined,
          // watermarked_image_url and visualization_image_url are null initially, client-side will generate them later
        }).select('*'); // Select all fields to get the full ArtworkImageRow

        if (dbErr) throw dbErr;
        uploadedImages.push(data[0]); // Assuming insert returns an array with one item

        // If this was the very first image for this artwork, update primary_image_url on the artwork itself
        if (isFirstImage && data.length > 0) {
            await supabase.from('artworks')
                .update({ primary_image_url: publicUrl })
                .eq('id', artworkId);
            isFirstImage = false; // Only update for the very first image
        }
      }

      addImages(uploadedImages); // Add all newly uploaded images to the store
      toast.success("Images uploaded successfully");
      setFiles([]);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-lg font-bold mb-4">Upload Artwork Images</h2>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed p-6 text-center cursor-pointer ${
            isDragActive ? "border-blue-500" : "border-gray-300"
          }`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the images here ...</p>
          ) : (
            <p>Drag & drop images here, or click to select files</p>
          )}
        </div>

        {files.length > 0 && (
          <ul className="mt-4 max-h-48 overflow-y-auto space-y-2">
            {files.map((file, idx) => (
              <li key={idx}>{file.name}</li>
            ))}
          </ul>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button
            className="px-3 py-1 bg-gray-300 rounded"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1 bg-black text-white rounded"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}