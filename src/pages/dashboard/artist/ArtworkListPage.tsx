// src/pages/dashboard/artist/ArtworkListPage.tsx
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import FiltersSidebar, { Filters } from "@/components/ui/FiltersSidebar";
import ArtworkActionsMenu from "@/components/dashboard/ArtworkActionsMenu";

type CatalogueRef = { id: string; title: string; slug: string | null };
type ArtworkImage = {
  id: string;
  image_url: string;
  watermarked_image_url?: string | null;
  visualization_image_url?: string | null;
  position?: number;
};

export type Artwork = {
  id: string;
  slug: string | null;
  title: string | null;
  price: number | null;
  currency: string | null;
  genre: string | null;
  keywords?: string[] | null;
  dominant_colors?: string[] | null;
  color_groups?: string[] | null;
  status:
    | "draft"
    | "available"
    | "pending"
    | "on hold"
    | "sold"
    | "Available"
    | "Pending"
    | "On Hold"
    | "Sold";
  artwork_images?: ArtworkImage[];
  artwork_catalogue_junction?: { catalogue: CatalogueRef }[];
};

export default function ArtworkListPage() {
  const [filters, setFilters] = useState<Filters>({
    genre: [],
    status: [],
    keyword: [],
    color: [],
    search: "",
    sort: "newest",
  });

  const { data: artworks, isLoading } = useQuery<Artwork[]>({
    queryKey: ["artworks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artworks")
        .select(`
          id, slug, title, price, currency, genre, keywords, dominant_colors, status,
          artwork_images ( id, image_url, watermarked_image_url, visualization_image_url, position ),
          artwork_catalogue_junction (
            catalogue:catalogues ( id, title, slug )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error(`Failed to load artworks: ${error.message}`);
        throw new Error(error.message);
      }
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!artworks) return [];

    const normalizeStatus = (s: Artwork["status"]) =>
      s?.toLowerCase() === "available"
        ? "available"
        : ["pending", "on hold", "sold"].includes(s?.toLowerCase() ?? "")
        ? "draft"
        : s?.toLowerCase() ?? "";

    return artworks
      .filter((a) => {
        if (filters.genre.length && !filters.genre.includes(a.genre ?? "")) return false;
        if (filters.status.length && !filters.status.includes(normalizeStatus(a.status))) return false;
        if (filters.keyword.length && !a.keywords?.some((k) => filters.keyword.includes(k))) return false;
        if (filters.color.length && !a.color_groups?.some((c) => filters.color.includes(c))) return false;
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const matchTitle = a.title?.toLowerCase().includes(q);
          const matchKeyword = a.keywords?.some((k) => k.toLowerCase().includes(q));
          const matchColor = a.color_groups?.some((c) => c.toLowerCase().includes(q));
          if (!matchTitle && !matchKeyword && !matchColor) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case "price-low":
            return (a.price ?? 0) - (b.price ?? 0);
          case "price-high":
            return (b.price ?? 0) - (a.price ?? 0);
          case "title-az":
            return (a.title ?? "").localeCompare(b.title ?? "");
          case "title-za":
            return (b.title ?? "").localeCompare(a.title ?? "");
          default:
            return 0; // newest already from query
        }
      });
  }, [artworks, filters]);

  if (isLoading) return <p>Loading artworks...</p>;
  if (!artworks?.length) return <p>No artworks found.</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>My Artworks</h1>
        <Link to="/u/artworks/wizard">+ New Artwork</Link>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <FiltersSidebar artworks={artworks} filters={filters} setFilters={setFilters} />

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            flex: 1,
          }}
        >
          {filtered.map((art) => {
            const cover =
              [...(art.artwork_images ?? [])]
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]?.image_url ??
              "https://placehold.co/600x450?text=No+Image";

            const cat = art.artwork_catalogue_junction?.[0]?.catalogue;

            // Always go to edit page
            const editHref = `/u/artworks/edit/${art.id}`;

            return (
              <div key={art.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
                <img src={cover} alt={art.title ?? "Artwork"} style={{ width: "100%", height: 200, objectFit: "cover" }} />
                <div style={{ padding: 12 }}>
                  <h3>{art.title ?? "Untitled"}</h3>
                  {art.price != null && (
                    <p>
                      {(art.currency ?? "ZAR")} {art.price.toLocaleString()}
                    </p>
                  )}
                  {art.genre && <p>Genre: {art.genre}</p>}
                  {art.keywords?.length ? <p>Keywords: {art.keywords.join(", ")}</p> : null}
                  {art.color_groups?.length ? <p>Colors: {art.color_groups.join(", ")}</p> : null}
                  {cat && cat.slug && (
                    <p>
                      Part of Catalogue: <Link to={`/u/${cat.slug}`}>{cat.title}</Link>
                    </p>
                  )}
                  <p>Status: {String(art.status)}</p>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px 12px" }}>
                  <Link to={editHref}>Edit</Link>
                  <ArtworkActionsMenu artwork={{ id: art.id, slug: art.slug }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}