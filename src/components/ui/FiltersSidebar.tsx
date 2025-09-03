import React, { useEffect, useMemo, useState } from "react";
import { Sparkles } from 'lucide-react';
import { UserPreferences } from "@/pages/dashboard/collector/CollectorSettingsPage"; // Assuming type is exported

// --- TYPE DEFINITIONS ---

type Dimensions = {
  width?: number | null;
  height?: number | null;
  depth?: number | null;
  unit?: 'cm' | 'inch' | 'variable' | null;
};
type FramingInfo = {
  is_framed?: boolean | null;
  details?: string | null;
};
type SignatureInfo = {
  is_signed?: boolean | null;
  location?: string | null;
  details?: string | null;
};
type EditionInfo = {
  is_edition?: boolean | null;
  numeric_size?: number | null;
  ap_size?: number | null;
  sold_editions?: string[] | null;
};

type Artwork = {
  id: string;
  title: string | null;
  description: string | null;
  genre: string | null;
  status: "draft" | "available" | "Pending" | "Available" | "On Hold" | "Sold";
  keywords?: string[] | null;
  color_groups?: string[] | null;
  medium?: string | null;
  price: number | null;
  created_at?: string;
  subject?: string | null;
  orientation?: string | null;
  dimensions?: Dimensions | null;
  framing_info?: FramingInfo | null;
  signature_info?: SignatureInfo | null;
  edition_info?: EditionInfo | null;
  inventory_number?: string | null;
  private_note?: string | null;
  provenance_notes?: string | null;
  location?: string | null;
};

export type Filters = {
  genre: string[];
  status: string[];
  keyword: string[];
  color: string[];
  medium?: string[];
  search: string;
  sort?: "newest" | "price-low" | "price-high" | "title-az" | "title-za";
  priceMin?: number;
  priceMax?: number;
  creationYearMin?: number;
  creationYearMax?: number;
  subjectSearch?: string;
  orientation: string[];
  isFramed?: boolean | null;
  isSigned?: boolean | null;
  isEdition?: boolean | null;
  minHeight?: number;
  maxHeight?: number;
  minWidth?: number;
  maxWidth?: number;
  minDepth?: number;
  maxDepth?: number;
};

type Props = {
  artworks: Artwork[];
  filters?: Filters;
  setFilters?: React.Dispatch<React.SetStateAction<Filters>>;
  isArtistView: boolean;
  learnedPreferences?: UserPreferences['learned_preferences'] | null; // NEW: For dynamic filters
};

const orientationOptions = ['Portrait', 'Landscape', 'Square', 'Round', 'Irregular', 'Other'];

export default function FiltersSidebar({ artworks, filters, setFilters, isArtistView, learnedPreferences }: Props) {
  const safeFilters: Filters = useMemo(
    () =>
      filters ?? {
        genre: [], status: [], keyword: [], color: [], medium: [], search: "", sort: "newest",
        priceMin: undefined, priceMax: undefined, creationYearMin: undefined, creationYearMax: undefined,
        subjectSearch: "", orientation: [], isFramed: null, isSigned: null, isEdition: null,
        minHeight: undefined, maxHeight: undefined, minWidth: undefined, maxWidth: undefined, minDepth: undefined, maxDepth: undefined,
      },
    [filters]
  );
  
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [availableKeywords, setAvailableKeywords] = useState<string[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [availableMediums, setAvailableMediums] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<Filters["sort"]>(safeFilters.sort ?? "newest");

  const normalizeStatus = (s: Artwork["status"]) =>
    s === "Available" ? "available" : s === "Pending" ? "draft" : s === "On Hold" ? "draft" : s === "Sold" ? "draft" : (s as string).toLowerCase();

  useEffect(() => {
    const genres = Array.from(new Set(artworks.map((a) => a.genre).filter(Boolean))) as string[];
    const statuses = Array.from(new Set(artworks.map((a) => normalizeStatus(a.status)))) as string[];
    const keywords = Array.from(new Set(artworks.flatMap((a) => a.keywords ?? []))) as string[];
    const colors = Array.from(new Set(artworks.flatMap((a) => a.color_groups ?? []))) as string[];
    const mediumsFromArtworks = Array.from(new Set(artworks.map((a) => a.medium).filter(Boolean))) as string[];

    setAvailableGenres(genres);
    setAvailableStatuses(statuses);
    setAvailableKeywords(keywords);
    setAvailableColors(colors);
    setAvailableMediums(mediumsFromArtworks);
  }, [artworks]);

  const applyQuickFilter = (key: 'medium' | 'genre', value: string) => {
    if (!setFilters) return;
    setFilters(prev => ({ ...prev, [key]: [value] }));
  };
  
  const applyQuickPriceFilter = (min: number, max: number) => {
    if (!setFilters) return;
    setFilters(prev => ({ ...prev, priceMin: min, priceMax: max }));
  };

  const toggleFilter = (
    key: keyof Omit<Filters, "search" | "sort" | "priceMin" | "priceMax" | "creationYearMin" | "creationYearMax" | "subjectSearch" | "minHeight" | "maxHeight" | "minWidth" | "maxWidth" | "minDepth" | "maxDepth" | "isFramed" | "isSigned" | "isEdition">,
    value: string
  ) => {
    if (!setFilters) return;
    setFilters((prev) => {
      const base = prev ?? {
        genre: [], status: [], keyword: [], color: [], medium: [], search: "", sort: "newest",
        priceMin: undefined, priceMax: undefined, creationYearMin: undefined, creationYearMax: undefined,
        subjectSearch: "", orientation: [], isFramed: null, isSigned: null, isEdition: null,
        minHeight: undefined, maxHeight: undefined, minWidth: undefined, maxWidth: undefined, minDepth: undefined, maxDepth: undefined,
      };
      const current = base[key] as string[];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...base, [key]: next };
    });
  };

  const handleSearch: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (!setFilters) return;
    setFilters((prev) => ({
      ...(prev ?? {
        genre: [], status: [], keyword: [], color: [], medium: [], search: "", sort: "newest",
        priceMin: undefined, priceMax: undefined, creationYearMin: undefined, creationYearMax: undefined,
        subjectSearch: "", orientation: [], isFramed: null, isSigned: null, isEdition: null,
        minHeight: undefined, maxHeight: undefined, minWidth: undefined, maxWidth: undefined, minDepth: undefined, maxDepth: undefined,
      }),
      search: e.target.value,
    }));
  };

  const handleSort: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    setSortOption(e.target.value as Filters["sort"]);
    if (!setFilters) return;
    setFilters((prev) => ({
      ...(prev ?? {
        genre: [], status: [], keyword: [], color: [], medium: [], search: "", sort: "newest",
        priceMin: undefined, priceMax: undefined, creationYearMin: undefined, creationYearMax: undefined,
        subjectSearch: "", orientation: [], isFramed: null, isSigned: null, isEdition: null,
        minHeight: undefined, maxHeight: undefined, minWidth: undefined, maxWidth: undefined, minDepth: undefined, maxDepth: undefined,
      }),
      sort: e.target.value as Filters["sort"],
    }));
  };

  const handleNumberRangeChange = (key: keyof Filters, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) : undefined;
    if (!setFilters) return;
    setFilters((prev) => ({
      ...(prev ?? {
        genre: [], status: [], keyword: [], color: [], medium: [], search: "", sort: "newest",
        priceMin: undefined, priceMax: undefined, creationYearMin: undefined, creationYearMax: undefined,
        subjectSearch: "", orientation: [], isFramed: null, isSigned: null, isEdition: null,
        minHeight: undefined, maxHeight: undefined, minWidth: undefined, maxWidth: undefined, minDepth: undefined, maxDepth: undefined,
      }),
      [key]: value,
    }));
  };

  const handleBooleanFilterChange = (key: 'isFramed' | 'isSigned' | 'isEdition', value: boolean | null) => {
    if (!setFilters) return;
    setFilters((prev) => ({
      ...(prev ?? {
        genre: [], status: [], keyword: [], color: [], medium: [], search: "", sort: "newest",
        priceMin: undefined, priceMax: undefined, creationYearMin: undefined, creationYearMax: undefined,
        subjectSearch: "", orientation: [], isFramed: null, isSigned: null, isEdition: null,
        minHeight: undefined, maxHeight: undefined, minWidth: undefined, maxWidth: undefined, minDepth: undefined, maxDepth: undefined,
      }),
      [key]: value,
    }));
  };

  const handleSubjectSearchChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (!setFilters) return;
    setFilters((prev) => ({
      ...(prev ?? {
        genre: [], status: [], keyword: [], color: [], medium: [], search: "", sort: "newest",
        priceMin: undefined, priceMax: undefined, creationYearMin: undefined, creationYearMax: undefined,
        subjectSearch: "", orientation: [], isFramed: null, isSigned: null, isEdition: null,
        minHeight: undefined, maxHeight: undefined, minWidth: undefined, maxWidth: undefined, minDepth: undefined, maxDepth: undefined,
      }),
      subjectSearch: e.target.value,
    }));
  };

  return (
    <div className="filters-container">
      {!isArtistView && learnedPreferences && (
        <div className="filter-group quick-filters-group">
          <label className="quick-filters-label">
            <Sparkles size={20} />
            <span>Quick Filters For You</span>
          </label>
          <div className="quick-filters-pills">
              {learnedPreferences.top_liked_mediums?.slice(0, 3).map(item => (
                  <button key={item.name} className="quick-filter-pill" onClick={() => applyQuickFilter('medium', item.name)}>{item.name}</button>
              ))}
              {learnedPreferences.top_liked_styles?.slice(0, 3).map(item => (
                  <button key={item.name} className="quick-filter-pill" onClick={() => applyQuickFilter('genre', item.name)}>{item.name}</button>
              ))}
              {learnedPreferences.preferred_price_range_from_behavior && (
                  <button className="quick-filter-pill" onClick={() => applyQuickPriceFilter(learnedPreferences.preferred_price_range_from_behavior!.min, learnedPreferences.preferred_price_range_from_behavior!.max)}>
                      ~${learnedPreferences.preferred_price_range_from_behavior.min.toLocaleString()} - ${learnedPreferences.preferred_price_range_from_behavior.max.toLocaleString()}
                  </button>
              )}
          </div>
          <hr className="concierge-divider" />
        </div>
      )}

      <h2>{isArtistView ? "Filters" : "Traditional Filters"}</h2>

      <div className="filter-group">
        <label htmlFor="search-input">Keyword Search</label>
        <input id="search-input" type="text" value={safeFilters.search} onChange={handleSearch} placeholder="Search titles, descriptions..." />
      </div>

      {isArtistView && (
        <div className="filter-group">
          <label>Status</label>
          {availableStatuses.map((s) => (
            <div key={s} className="checkbox-item">
              <input id={`status-${s}`} type="checkbox" checked={safeFilters.status.includes(s)} onChange={() => toggleFilter("status", s)} />
              <label htmlFor={`status-${s}`}>{s}</label>
            </div>
          ))}
        </div>
      )}

      <div className="filter-group">
        <label>Keywords</label>
        {availableKeywords.map((k) => (
          <div key={k} className="checkbox-item">
            <input id={`keyword-${k}`} type="checkbox" checked={safeFilters.keyword.includes(k)} onChange={() => toggleFilter("keyword", k)} />
            <label htmlFor={`keyword-${k}`}>{k}</label>
          </div>
        ))}
      </div>

      <div className="filter-group">
        <label htmlFor="sort-select">Sort By</label>
        <select id="sort-select" value={sortOption} onChange={handleSort}>
          <option value="newest">Newest</option>
          <option value="price-low">Price: Low → High</option>
          <option value="price-high">Price: High → Low</option>
          <option value="title-az">Title: A → Z</option>
          <option value="title-za">Title: Z → A</option>
        </select>
      </div>
      
      {!isArtistView && (
        <>
          <div className="filter-group">
            <label htmlFor="subject-search-input">Subject</label>
            <input id="subject-search-input" type="text" value={safeFilters.subjectSearch ?? ''} onChange={handleSubjectSearchChange} placeholder="Search by subject" />
          </div>

          <div className="filter-group">
            <label htmlFor="orientation-select">Orientation</label>
            <select id="orientation-select" value={safeFilters.orientation[0] ?? ''} onChange={(e) => toggleFilter("orientation", e.target.value)}>
              <option value="">Any</option>
              {orientationOptions.map((o) => ( <option key={o} value={o}>{o}</option> ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Genre</label>
            {availableGenres.map((g) => (
              <div key={g} className="checkbox-item">
                <input id={`genre-${g}`} type="checkbox" checked={safeFilters.genre.includes(g)} onChange={() => toggleFilter("genre", g)} />
                <label htmlFor={`genre-${g}`}>{g}</label>
              </div>
            ))}
          </div>

          <div className="filter-group">
            <label>Colors</label>
            {availableColors.map((c) => (
              <div key={c} className="checkbox-item">
                <input id={`color-${c}`} type="checkbox" checked={safeFilters.color.includes(c)} onChange={() => toggleFilter("color", c)} />
                <label htmlFor={`color-${c}`}>{c}</label>
              </div>
            ))}
          </div>

          <div className="filter-group">
            <label>Medium</label>
            {availableMediums.map((m) => (
              <div key={m} className="checkbox-item">
                <input id={`medium-${m}`} type="checkbox" checked={safeFilters.medium?.includes(m) ?? false} onChange={() => toggleFilter("medium", m)} />
                <label htmlFor={`medium-${m}`}>{m}</label>
              </div>
            ))}
          </div>

          <div className="filter-group">
            <label>Price Range</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="number" placeholder="Min" value={safeFilters.priceMin ?? ""} onChange={(e) => handleNumberRangeChange("priceMin", e)} style={{ width: "80px" }} />
              <span>-</span>
              <input type="number" placeholder="Max" value={safeFilters.priceMax ?? ""} onChange={(e) => handleNumberRangeChange("priceMax", e)} style={{ width: "80px" }} />
            </div>
          </div>

          <div className="filter-group">
            <label>Creation Year</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="number" placeholder="Min Year" value={safeFilters.creationYearMin ?? ""} onChange={(e) => handleNumberRangeChange("creationYearMin", e)} style={{ width: "80px" }} />
              <span>-</span>
              <input type="number" placeholder="Max Year" value={safeFilters.creationYearMax ?? ""} onChange={(e) => handleNumberRangeChange("creationYearMax", e)} style={{ width: "80px" }} />
            </div>
          </div>

          <div className="filter-group">
            <label>Framing</label>
            <div className="radio-group-vertical">
              <div className="radio-item"><input id="is-framed-any" type="radio" name="isFramed" checked={safeFilters.isFramed === null} onChange={() => handleBooleanFilterChange("isFramed", null)} /><label htmlFor="is-framed-any">Any</label></div>
              <div className="radio-item"><input id="is-framed-true" type="radio" name="isFramed" checked={safeFilters.isFramed === true} onChange={() => handleBooleanFilterChange("isFramed", true)} /><label htmlFor="is-framed-true">Framed</label></div>
              <div className="radio-item"><input id="is-framed-false" type="radio" name="isFramed" checked={safeFilters.isFramed === false} onChange={() => handleBooleanFilterChange("isFramed", false)} /><label htmlFor="is-framed-false">Unframed</label></div>
            </div>
          </div>

          <div className="filter-group">
            <label>Signature</label>
            <div className="radio-group-vertical">
                <div className="radio-item"><input id="is-signed-any" type="radio" name="isSigned" checked={safeFilters.isSigned === null} onChange={() => handleBooleanFilterChange("isSigned", null)} /><label htmlFor="is-signed-any">Any</label></div>
                <div className="radio-item"><input id="is-signed-true" type="radio" name="isSigned" checked={safeFilters.isSigned === true} onChange={() => handleBooleanFilterChange("isSigned", true)} /><label htmlFor="is-signed-true">Signed</label></div>
                <div className="radio-item"><input id="is-signed-false" type="radio" name="isSigned" checked={safeFilters.isSigned === false} onChange={() => handleBooleanFilterChange("isSigned", false)} /><label htmlFor="is-signed-false">Unsigned</label></div>
            </div>
          </div>

          <div className="filter-group">
            <label>Edition Type</label>
            <div className="radio-group-vertical">
                <div className="radio-item"><input id="is-edition-any" type="radio" name="isEdition" checked={safeFilters.isEdition === null} onChange={() => handleBooleanFilterChange("isEdition", null)} /><label htmlFor="is-edition-any">Any</label></div>
                <div className="radio-item"><input id="is-edition-true" type="radio" name="isEdition" checked={safeFilters.isEdition === true} onChange={() => handleBooleanFilterChange("isEdition", true)} /><label htmlFor="is-edition-true">Edition</label></div>
                <div className="radio-item"><input id="is-edition-false" type="radio" name="isEdition" checked={safeFilters.isEdition === false} onChange={() => handleBooleanFilterChange("isEdition", false)} /><label htmlFor="is-edition-false">Unique Work</label></div>
            </div>
          </div>

          <div className="filter-group">
            <label>Height (cm)</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="number" placeholder="Min" value={safeFilters.minHeight ?? ""} onChange={(e) => handleNumberRangeChange("minHeight", e)} style={{ width: "80px" }} />
              <span>-</span>
              <input type="number" placeholder="Max" value={safeFilters.maxHeight ?? ""} onChange={(e) => handleNumberRangeChange("maxHeight", e)} style={{ width: "80px" }} />
            </div>
          </div>
          <div className="filter-group">
            <label>Width (cm)</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="number" placeholder="Min" value={safeFilters.minWidth ?? ""} onChange={(e) => handleNumberRangeChange("minWidth", e)} style={{ width: "80px" }} />
              <span>-</span>
              <input type="number" placeholder="Max" value={safeFilters.maxWidth ?? ""} onChange={(e) => handleNumberRangeChange("maxWidth", e)} style={{ width: "80px" }} />
            </div>
          </div>
          <div className="filter-group">
            <label>Depth (cm)</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="number" placeholder="Min" value={safeFilters.minDepth ?? ""} onChange={(e) => handleNumberRangeChange("minDepth", e)} style={{ width: "80px" }} />
              <span>-</span>
              <input type="number" placeholder="Max" value={safeFilters.maxDepth ?? ""} onChange={(e) => handleNumberRangeChange("maxDepth", e)} style={{ width: "80px" }} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}