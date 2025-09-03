import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import { CircularProgress } from '@mui/material'; // Import CircularProgress

interface ArtworkImage {
  id: string;
  image_url: string;
  position: number;
  is_primary: boolean; // Ensure this is part of the type
}

interface ImageDropzoneProps {
  artworkId: string;
  images: ArtworkImage[];
  onUploadSuccess: (newImage: ArtworkImage) => Promise<void>; // Changed to onUploadSuccess callback
  isUploading?: boolean; // New prop for loading state
}

export default function ImageDropzone({ artworkId, images, onUploadSuccess, isUploading }: ImageDropzoneProps) {
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!artworkId || artworkId === 'new-artwork-temp-id') {
        toast.error("Please save artwork details first to upload images.");
        return;
      }
      if (isUploading) return; // Prevent multiple uploads while one is in progress

      // The loading state is now managed by the parent component (ArtworkForm)
      // via `isUploadingNewImage` and `onUploadSuccess`.

      for (const file of acceptedFiles) {
        try {
          const path = `${artworkId}/${uuidv4()}-${file.name}`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from("artworks")
            .upload(path, file, { upsert: true });

          if (uploadErr) throw uploadErr;

          const { data: publicUrlData } = supabase.storage.from("artworks").getPublicUrl(path);
          const publicUrl = publicUrlData.publicUrl;

          const newPosition = images.length === 0 ? 0 : images.length;
          const isPrimary = images.length === 0;

          const { data: newImage, error: insertErr } = await supabase
            .from("artwork_images")
            .insert({
              artwork_id: artworkId,
              image_url: publicUrl,
              position: newPosition,
              is_primary: isPrimary,
            })
            .select("*")
            .single();

          if (insertErr) throw insertErr;

          await onUploadSuccess(newImage); // Call parent's success handler
          // toast.success("Image uploaded!"); // Parent's toast handles final success

        } catch (err: any) {
          console.error("Image upload/insert failed:", err);
          toast.error(err.message || "Image upload failed");
        }
      }
    },
    [artworkId, images.length, onUploadSuccess, isUploading] // Dependencies for useCallback
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    disabled: !artworkId || artworkId === 'new-artwork-temp-id' || isUploading, // Disable if uploading
  });

  const dropzoneText = !artworkId || artworkId === 'new-artwork-temp-id'
    ? "Save artwork details first to upload images"
    : images.length === 0
    ? "Drag & drop primary image here, or click to select file (required)"
    : "Drag & drop additional images here, or click to select files";

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded p-4 text-center cursor-pointer transition-colors ${
        isDragActive ? "border-blue-500 bg-gray-50" : "border-gray-300"
      } ${!artworkId || artworkId === 'new-artwork-temp-id' || isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      onBlur={() => { /* You might want to add a touched state here for images */ }}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <CircularProgress size={24} />
      ) : (
        <p>{dropzoneText}</p>
      )}
    </div>
  );
}