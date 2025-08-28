import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import ArtworkEditorForm from "@/components/dashboard/ArtworkEditorForm";

// ---------- Types ----------
type Artwork = {
  id: string;
  user_id: string;
  title: string | null;
  description: string | null;
  price: number | null;
  currency: string | null;
  is_price_negotiable: boolean | null;
  min_price: number | null;
  max_price: number | null;
  medium: string | null;
  genre: string | null;
  dimensions: {
    width: number | string | null;
    height: number | string | null;
    depth?: number | string | null;
    unit: "cm";
  } | null;
  status: string;
  keywords?: string[] | null;
  dominant_colors?: string[] | null;
};

type ArtworkImage = {
  id: string;
  artwork_id: string;
  image_url: string;
  watermarked_image_url: string | null;
  visualization_image_url: string | null;
  position: number;
};

// ---------- Page Component ----------
export default function ArtworkEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Load artwork (with images)
  const { data: artwork, isLoading } = useQuery<Artwork & { artwork_images: ArtworkImage[] }>({
    queryKey: ["artwork", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artworks")
        .select(
          `
          id, user_id, title, description, price, currency, is_price_negotiable,
          min_price, max_price, medium, genre, dimensions, status, keywords, dominant_colors,
          artwork_images ( id, image_url, watermarked_image_url, visualization_image_url, position )
          `
        )
        .eq("id", id)
        .single();

      if (error) throw new Error(error.message);
      return data as Artwork & { artwork_images: ArtworkImage[] };
    },
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("artworks").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["artworks"] });
      toast.success("Artwork deleted");
      navigate("/dashboard/artist/artworks");
    },
    onError: (e: any) => {
      toast.error(e.message ?? "Failed to delete artwork");
    },
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div className="page-wrap">
      <div className="header">
        <h1>{id ? "Edit Artwork" : "Create New Artwork"}</h1>
        {id && (
          <button
            className="btn-danger"
            onClick={() => {
              if (confirm("Are you sure you want to delete this artwork?")) {
                deleteMutation.mutate();
              }
            }}
          >
            Delete
          </button>
        )}
      </div>

      <ArtworkEditorForm
        artworkId={id}
        onSaved={(newId) => {
          navigate(`/dashboard/artist/artworks/${newId}`);
        }}
      />

      <style jsx>{`
        .page-wrap {
          padding: 2rem;
          max-width: 1000px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .btn-danger {
          appearance: none;
          border: none;
          background: #fee2e2;
          color: #991b1b;
          padding: 0.6rem 1rem;
          border-radius: 10px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
