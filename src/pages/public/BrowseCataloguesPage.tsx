import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Artwork, Catalogue } from "../types";

type Filters = {
  genre: string[];
  keyword: string[];
  search: string;
  sort: "newest" | "price-low" | "price-high" | "title-az" | "title-za";
};

type Props = {
  catalogues: Catalogue[];
};

export default function BrowseCataloguesPage({ catalogues }: Props) {
  const [filters, setFilters] = useState<Filters>({
    genre: [],
    keyword: [],
    search: "",
    sort: "newest",
  });

  // Compute filtered catalogues and artworks
  const filteredCatalogues = useMemo(() => {
    return catalogues
      .map((cat) => {
        const availableArts = cat.artworks?.filter(
          (a) => (a.status ?? "").toLowerCase() === "available"
        ) ?? [];

        const filteredArts = availableArts.filter((a) => {
          const matchesGenre =
            filters.genre.length === 0 || (a.genre && filters.genre.includes(a.genre));
          const matchesKeyword =
            filters.keyword.length === 0 ||
            (a.keywords && a.keywords.some((k) => filters.keyword.includes(k)));
          const matchesSearch =
            filters.search === "" ||
            a.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
            a.keywords?.some((k) => k.toLowerCase().includes(filters.search.toLowerCase()));

          return matchesGenre && matchesKeyword && matchesSearch;
        });

        return { ...cat, artworks: filteredArts };
      })
      .filter((cat) => (cat.artworks?.length ?? 0) > 0)
      .sort((a, b) => {
        switch (filters.sort) {
          case "price-low":
            return (a.artworks?.[0].price ?? 0) - (b.artworks?.[0].price ?? 0);
          case "price-high":
            return (b.artworks?.[0].price ?? 0) - (a.artworks?.[0].price ?? 0);
          case "title-az":
            return (a.title ?? "").localeCompare(b.title ?? "");
          case "title-za":
            return (b.title ?? "").localeCompare(a.title ?? "");
          case "newest":
          default:
            return (
              new Date(b.created_at ?? 0).getTime() -
              new Date(a.created_at ?? 0).getTime()
            );
        }
      });
  }, [catalogues, filters]);

  return (
    <div style={{ padding: "16px" }}>
      <h1>Browse Catalogues</h1>

      {/* Filters */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="Search artworks..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          value={filters.sort}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value as Filters["sort"] })}
        >
          <option value="newest">Newest</option>
          <option value="price-low">Price: Low → High</option>
          <option value="price-high">Price: High → Low</option>
          <option value="title-az">Title A → Z</option>
          <option value="title-za">Title Z → A</option>
        </select>
      </div>

      {/* Catalogues */}
      {filteredCatalogues.length === 0 ? (
        <p>No catalogues match your filters.</p>
      ) : (
        filteredCatalogues.map((cat) => (
          <div key={cat.id} style={{ marginBottom: "32px" }}>
            <h2>{cat.title}</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              {cat.artworks?.map((art) => (
                <div
                  key={art.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    overflow: "hidden",
                    padding: "8px",
                  }}
                >
                  <Link to={`/artwork/${art.slug ?? ""}`}>
                    <img
                      src={art.artwork_images?.[0]?.image_url ?? "https://placehold.co/400x300"}
                      alt={art.title ?? "Artwork"}
                      style={{ width: "100%", height: "150px", objectFit: "cover" }}
                    />
                    <h3>{art.title ?? "Untitled"}</h3>
                  </Link>
                  <p>{art.price ? `R${art.price.toLocaleString()}` : "Price on request"}</p>
                  {art.genre && <p>Genre: {art.genre}</p>}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}