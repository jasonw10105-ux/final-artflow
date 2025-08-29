import React, { useEffect, useMemo, useState } from "react";

type Artwork = {
  id: string;
  title: string | null;
  genre: string | null;
  status: "draft" | "available" | "Pending" | "Available" | "On Hold" | "Sold";
  keywords: string[] | null;
  color_groups?: string[] | null;
  price: number | null;
};

export type Filters = {
  genre: string[];
  status: string[];
  keyword: string[];
  color: string[];
  search: string;
  sort?: "newest" | "price-low" | "price-high" | "title-az" | "title-za";
};

type Props = {
  artworks: Artwork[];
  filters?: Filters;
  setFilters?: React.Dispatch<React.SetStateAction<Filters>>;
};

export default function FiltersSidebar({ artworks, filters, setFilters }: Props) {
  const safeFilters: Filters = useMemo(
    () =>
      filters ?? { genre: [], status: [], keyword: [], color: [], search: "", sort: "newest" },
    [filters]
  );
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [availableKeywords, setAvailableKeywords] = useState<string[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<Filters["sort"]>(safeFilters.sort ?? "newest");

  useEffect(() => {
    const genres = Array.from(new Set(artworks.map((a) => a.genre).filter(Boolean))) as string[];
    const norm = (s: Artwork["status"]) =>
      s === "Available" ? "available" :
      s === "Pending" ? "draft" :
      s === "On Hold" ? "draft" :
      s === "Sold" ? "draft" :
      (s as string).toLowerCase();
    const statuses = Array.from(new Set(artworks.map((a) => norm(a.status)))) as string[];
    const keywords = Array.from(new Set(artworks.flatMap((a) => a.keywords ?? []))) as string[];
    const colors = Array.from(new Set(artworks.flatMap((a) => a.color_groups ?? []))) as string[];

    setAvailableGenres(genres);
    setAvailableStatuses(statuses);
    setAvailableKeywords(keywords);
    setAvailableColors(colors);
  }, [artworks]);

  const toggleFilter = (key: keyof Omit<Filters,"search"|"sort">, value: string) => {
    if (!setFilters) return;
    setFilters((prev) => {
      const base = prev ?? { genre: [], status: [], keyword: [], color: [], search: "", sort: "newest" };
      const current = base[key];
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...base, [key]: next };
    });
  };

  const handleSearch: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (!setFilters) return;
    setFilters((prev) => ({ ...(prev ?? { genre: [], status: [], keyword: [], color: [], search: "", sort: "newest" }), search: e.target.value }));
  };

  const handleSort: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    setSortOption(e.target.value as Filters["sort"]);
    if (!setFilters) return;
    setFilters((prev) => ({ ...(prev ?? { genre: [], status: [], keyword: [], color: [], search: "" }), sort: e.target.value as Filters["sort"] }));
  };

  return (
    <aside>
      <h2>Filters</h2>

      <div>
        <label>Search</label>
        <input
          type="text"
          value={safeFilters.search}
          onChange={handleSearch}
          placeholder="Search title, keywords, or colors"
        />
      </div>

      <div>
        <label>Genre</label>
        {availableGenres.map((g) => (
          <div key={g}>
            <input
              type="checkbox"
              checked={safeFilters.genre.includes(g)}
              onChange={() => toggleFilter("genre", g)}
            />
            <span>{g}</span>
          </div>
        ))}
      </div>

      <div>
        <label>Status</label>
        {availableStatuses.map((s) => (
          <div key={s}>
            <input
              type="checkbox"
              checked={safeFilters.status.includes(s)}
              onChange={() => toggleFilter("status", s)}
            />
            <span>{s}</span>
          </div>
        ))}
      </div>

      <div>
        <label>Keywords</label>
        {availableKeywords.map((k) => (
          <div key={k}>
            <input
              type="checkbox"
              checked={safeFilters.keyword.includes(k)}
              onChange={() => toggleFilter("keyword", k)}
            />
            <span>{k}</span>
          </div>
        ))}
      </div>

      <div>
        <label>Colors</label>
        {availableColors.map((c) => (
          <div key={c}>
            <input
              type="checkbox"
              checked={safeFilters.color.includes(c)}
              onChange={() => toggleFilter("color", c)}
            />
            <span>{c}</span>
          </div>
        ))}
      </div>

      <div>
        <label>Sort By</label>
        <select value={sortOption} onChange={handleSort}>
          <option value="newest">Newest</option>
          <option value="price-low">Price: Low → High</option>
          <option value="price-high">Price: High → Low</option>
          <option value="title-az">Title: A → Z</option>
          <option value="title-za">Title: Z → A</option>
        </select>
      </div>
    </aside>
  );
}
