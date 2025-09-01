import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthProvider";
import toast from "react-hot-toast";

export default function CatalogueWizardPage() {
  const { catalogueId } = useParams<{ catalogueId: string }>();
  const isEditing = !!catalogueId;
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedArtworks, setSelectedArtworks] = useState<any[]>([]);
  const [coverArtworkId, setCoverArtworkId] = useState<string | null>(null);
  const [isSystem, setIsSystem] = useState(false);

  const { data: allArtworks } = useQuery({
    queryKey: ["allUserArtworks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("artworks")
        .select("id, title, image_url")
        .eq("user_id", user.id)
        .in("status", ["Available", "Sold"]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: existingCatalogueData } = useQuery({
    queryKey: ["catalogue", catalogueId],
    queryFn: async () => {
      if (!catalogueId) return null;
      const { data, error } = await supabase
        .from("catalogues")
        .select("*")
        .eq("id", catalogueId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingCatalogueData) {
      setTitle(existingCatalogueData.title || "");
      setDescription(existingCatalogueData.description || "");
      setIsSystem(existingCatalogueData.is_system_catalogue || false);
      setCoverArtworkId(existingCatalogueData.cover_artwork_id || null);
    }
  }, [existingCatalogueData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      const payload = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        is_system_catalogue: isSystem,
        cover_artwork_id: coverArtworkId,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("catalogues")
          .update(payload)
          .eq("id", catalogueId);
        if (error) throw error;
        return catalogueId;
      } else {
        const { data, error } = await supabase
          .from("catalogues")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        return data.id;
      }
    },
    onSuccess: (id) => {
      toast.success(`Catalogue ${isEditing ? "updated" : "created"}`);
      navigate(`/dashboard/artist/catalogues/${id}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="page-wrap">
      <h1>{isEditing ? "Edit Catalogue" : "Create Catalogue"}</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        className="space-y-4 max-w-2xl mx-auto"
      >
        <div>
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="input-field"
          />
        </div>

        <div>
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label>Cover Artwork</label>
          <select
            value={coverArtworkId || ""}
            onChange={(e) => setCoverArtworkId(e.target.value || null)}
            className="input-field"
          >
            <option value="">-- None --</option>
            {allArtworks?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            type="submit"
            className="btn-primary"
            disabled={saveMutation.isLoading}
          >
            {saveMutation.isLoading
              ? isEditing
                ? "Saving…"
                : "Creating…"
              : isEditing
              ? "Save Changes"
              : "Create Catalogue"}
          </button>
        </div>
      </form>
    </div>
  );
}