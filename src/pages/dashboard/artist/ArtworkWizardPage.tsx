import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthProvider";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useState } from "react";

export default function ArtworkWizardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("ZAR");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const payload = {
        user_id: user.id,
        title: title.trim() || null,
        genre: genre.trim() || null,
        price: price ? Number(price) : null,
        currency,
        status: "Pending",
      };

      const { data, error } = await supabase
        .from("artworks")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Artwork created");
      navigate(`/dashboard/artist/artworks/${id}`);
    },
    onError: (err: any) => {
      toast.error(err.message ?? "Failed to create artwork");
    },
  });

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">New Artwork</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Untitled No. 5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Genre</label>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="e.g. Abstract, Figurative"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Price</label>
          <input
            type="number"
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 12000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Currency</label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="ZAR">ZAR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-black text-white px-4 py-2 hover:bg-gray-900 disabled:opacity-50"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Creating…" : "Create Artwork"}
          </button>
        </div>
      </form>
    </div>
  );
}
