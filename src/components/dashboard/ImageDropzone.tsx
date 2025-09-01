import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";

interface ArtworkImage {
  id: string;
  image_url: string;
  position: number;
}

interface ImageDropzoneProps {
  artworkId: string; // The ID of the artwork this dropzone belongs to
  images: ArtworkImage[]; // Current list of images
  setImages: React.Dispatch<React.SetStateAction<ArtworkImage[]>>; // Setter for images
}

export default function ImageDropzone({ artworkId, images, setImages }: ImageDropzoneProps) {
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!artworkId || artworkId === 'new-artwork-temp-id') {
        toast.error("Please save artwork details first to upload images.");
        return;
      }

      for (const file of acceptedFiles) {
        try {
          const path = `${artworkId}/${uuidv4()}-${file.name}`;
          const { error: uploadErr } = await supabase.storage
            .from("artworks") // Ensure this bucket exists in Supabase Storage
            .upload(path, file, { upsert: true });

          if (uploadErr) throw uploadErr;

          const { data: publicUrlData } = supabase.storage.from("artworks").getPublicUrl(path);
          const publicUrl = publicUrlData.publicUrl;

          // Determine position: if no images, this is primary (position 0), else append
          const newPosition = images.length === 0 ? 0 : images.length;
          const isPrimary = images.length === 0; // The very first image uploaded is primary

          const { data: newImage, error: insertErr } = await supabase
            .from("artwork_images") // Ensure this table exists
            .insert({
              artwork_id: artworkId,
              image_url: publicUrl,
              position: newPosition,
              is_primary: isPrimary, // Set is_primary flag
            })
            .select("*")
            .single();

          if (insertErr) throw insertErr;

          setImages((prev) => [...prev, newImage]);
          toast.success("Image uploaded!");
        } catch (err: any) {
          console.error("Image upload/insert failed:", err);
          toast.error(err.message || "Image upload failed");
        }
      }
    },
    [artworkId, images.length, setImages] // Dependencies for useCallback
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    disabled: !artworkId || artworkId === 'new-artwork-temp-id', // Disable dropzone if no valid artwork ID
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
      } ${!artworkId || artworkId === 'new-artwork-temp-id' ? 'opacity-50 cursor-not-allowed' : ''}`}
      onBlur={() => { /* You might want to add a touched state here for images */ }} // Add this if you want to track touched state for images via dropzone interaction
    >
      <input {...getInputProps()} />
      <p>{dropzoneText}</p>
    </div>
  );
}