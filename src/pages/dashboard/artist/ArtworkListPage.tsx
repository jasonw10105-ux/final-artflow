import React, { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import FiltersSidebar, { Filters } from "@/components/ui/FiltersSidebar"; // Assuming FiltersSidebar exists
import { AppArtwork, AppArtworkWithJunction } from '@/types/app.types'; // Use AppArtwork
import ArtworkActionsMenu from "@/components/dashboard/ArtworkActionsMenu"; // Assuming ArtworkActionsMenu exists
import ShareButton from "@/components/ui/ShareButton"; // Reusable ShareButton component
import { PlusCircle, Upload, Tag, Archive, XCircle, Settings, ImageOff } from 'lucide-react'; // Added ImageOff for placeholder
import '@/styles/app.css'; // Import the centralized styles

// --- CSV Import Modal Component ---
interface CsvImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportSuccess: () => void;
    userId: string;
}

const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose, onImportSuccess, userId }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [importLog, setImportLog] = useState<string[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setImportLog([]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast.error("Please select a CSV file to upload.");
            return;
        }

        setIsLoading(true);
        setImportLog([]);
        const reader = new FileReader();

        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').filter(line => line.trim() !== '');

            if (lines.length < 2) {
                toast.error("CSV file is empty or too short.");
                setIsLoading(false);
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const artworksToInsert = [];

            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                if (values.length !== headers.length) {
                    setImportLog(prev => [...prev, `Skipping row ${i + 1}: Mismatched column count.`]);
                    continue;
                }

                const artwork: Partial<AppArtwork> = { user_id: userId, status: 'draft' };
                headers.forEach((header, index) => {
                    if (header === 'title') artwork.title = values[index];
                    else if (header === 'description') artwork.description = values[index];
                    else if (header === 'price') artwork.price = parseFloat(values[index]) || null;
                    else if (header === 'currency') artwork.currency = values[index];
                    else if (header === 'genre') artwork.genre = values[index];
                    else if (header === 'medium') artwork.medium = values[index];
                    else if (header === 'subject') artwork.subject = values[index];
                    else if (header === 'keywords') artwork.keywords = values[index].split(';').map(k => k.trim()).filter(Boolean);
                    else if (header === 'inventory_number') artwork.inventory_number = values[index];
                    // Add more mappings as needed (dimensions, etc.)
                });

                if (artwork.title && artwork.medium) { // Basic validation
                    artworksToInsert.push(artwork);
                } else {
                    setImportLog(prev => [...prev, `Skipping row ${i + 1}: Missing title or medium.`]);
                }
            }

            if (artworksToInsert.length === 0) {
                toast.error("No valid artworks found in the CSV for import.");
                setIsLoading(false);
                return;
            }

            try {
                // Bulk insert operation
                const { error } = await supabase.from('artworks').insert(artworksToInsert as any[]);
                if (error) throw error;

                toast.success(`CSV Import Complete: ${artworksToInsert.length} artworks added!`);
                onImportSuccess();
                onClose();
            } catch (error: any) {
                setImportLog(prev => [...prev, `Error during Supabase insert: ${error.message}`]);
                toast.error(`Import failed: ${error.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        reader.readAsText(file);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-content csv-import-modal-content">
                <div className="modal-header">
                    <h3>Import Artworks from CSV</h3>
                    <button type="button" onClick={onClose} className="button-icon-secondary"><XCircle size={20} /></button>
                </div>
                <div className="modal-body">
                    <p className="text-muted-foreground mb-4">Upload a CSV file containing your artwork details. Supported headers: <code className="code-snippet">title</code>, <code className="code-snippet">description</code>, <code className="code-snippet">price</code>, <code className="code-snippet">currency</code>, <code className="code-snippet">genre</code>, <code className="code-snippet">medium</code>, <code className="code-snippet">subject</code>, <code className="code-snippet">keywords</code> (semicolon-separated), <code className="code-snippet">inventory_number</code>.</p>
                    <div className="form-group mb-4">
                        <label htmlFor="csv-file" className="label">Select CSV File</label>
                        <input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} className="input-file" />
                    </div>
                    {file && <p className="mb-2">Selected file: <strong>{file.name}</strong></p>}
                    <button onClick={handleUpload} className="button button-primary w-full" disabled={!file || isLoading}>
                        {isLoading ? 'Importing...' : 'Upload and Import'}
                    </button>
                    {importLog.length > 0 && (
                        <div className="import-log-box">
                            <h4>Import Log:</h4>
                            {importLog.map((log, index) => (
                                <p key={index} className="text-sm">{log}</p>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- Bulk Actions Modal (Placeholder) ---
interface BulkActionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedArtworkIds: string[];
    onApplyAction: (action: string) => void;
}

const BulkActionsModal: React.FC<BulkActionsModalProps> = ({ isOpen, onClose, selectedArtworkIds, onApplyAction }) => {
    const [actionType, setActionType] = useState('');

    const handleSubmit = () => {
        if (actionType) {
            onApplyAction(actionType);
            onClose();
        } else {
            toast.error("Please select an action.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-content bulk-actions-modal-content">
                <div className="modal-header">
                    <h3>Bulk Actions ({selectedArtworkIds.length} Artworks)</h3>
                    <button type="button" onClick={onClose} className="button-icon-secondary"><XCircle size={20} /></button>
                </div>
                <div className="modal-body">
                    <p className="text-muted-foreground mb-4">Choose an action to apply to all selected artworks.</p>
                    <div className="form-group mb-4">
                        <label className="label">Select Action</label>
                        <select className="input" value={actionType} onChange={(e) => setActionType(e.target.value)}>
                            <option value="">-- Select --</option>
                            <option value="mark-available">Mark as Available</option>
                            <option value="mark-sold">Mark as Sold</option>
                            <option value="add-tags">Add Tags</option>
                            <option value="delete">Delete Artworks</option>
                            <option value="add-to-catalogue">Add to Catalogue</option> {/* Added for bulk actions */}
                            <option value="update-price">Update Price</option> {/* Added for bulk actions */}
                        </select>
                    </div>
                    <button onClick={handleSubmit} className="button button-primary w-full" disabled={!actionType}>
                        Apply Action
                    </button>
                </div>
            </div>
        </div>
    );
};


export default function ArtworkListPage() {
  const [filters, setFilters] = useState<Filters>({
    genre: [], status: [], keyword: [], color: [], medium: [], search: "", sort: "newest",
    priceMin: undefined, priceMax: undefined, creationYearMin: undefined, creationYearMax: undefined,
    subjectSearch: "", orientation: [], isFramed: null, isSigned: null, isEdition: null,
    minHeight: undefined, maxHeight: undefined, minWidth: undefined, maxWidth: undefined, minDepth: undefined, maxDepth: undefined,
  });
  const { user, profile, loading: authLoading } = useAuth(); // Added authLoading
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // For mobile sidebar
  const [selectedArtworkIds, setSelectedArtworkIds] = useState<string[]>([]); // For bulk actions
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);

  console.log("ArtworkListPage: Component rendered. Auth State:", { user, profile, authLoading }); // Global Log 1

  // --- Deep Linking for Filters (useEffect to parse URL on load) ---
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setFilters({
      genre: params.get('genre')?.split(',') || [],
      status: params.get('status')?.split(',') || [],
      keyword: params.get('keyword')?.split(',') || [],
      color: params.get('color')?.split(',') || [],
      medium: params.get('medium')?.split(',') || [],
      search: params.get('search') || '',
      sort: (params.get('sort') as Filters['sort']) || 'newest',
      priceMin: params.get('priceMin') ? parseFloat(params.get('priceMin')!) : undefined,
      priceMax: params.get('priceMax') ? parseFloat(params.get('priceMax')!) : undefined,
      creationYearMin: params.get('creationYearMin') ? parseInt(params.get('creationYearMin')!) : undefined,
      creationYearMax: params.get('creationYearMax') ? parseInt(params.get('creationYearMax')!) : undefined,
      subjectSearch: params.get('subjectSearch') || '',
      orientation: params.get('orientation')?.split(',') || [],
      isFramed: params.get('isFramed') ? (params.get('isFramed') === 'true') : null,
      isSigned: params.get('isSigned') ? (params.get('isSigned') === 'true') : null,
      isEdition: params.get('isEdition') ? (params.get('isEdition') === 'true') : null,
      minHeight: params.get('minHeight') ? parseFloat(params.get('minHeight')!) : undefined,
      maxHeight: params.get('maxHeight') ? parseFloat(params.get('maxHeight')!) : undefined,
      minWidth: params.get('minWidth') ? parseFloat(params.get('minWidth')!) : undefined,
      maxWidth: params.get('maxWidth') ? parseFloat(params.get('maxWidth')!) : undefined,
      minDepth: params.get('minDepth') ? parseFloat(params.get('minDepth')!) : undefined,
      maxDepth: params.get('maxDepth') ? parseFloat(params.get('maxDepth')!) : undefined,
    });
  }, [location.search]);

  // --- Update URL on Filter Change (useEffect to update URL) ---
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)) {
        params.set(key, Array.isArray(value) ? value.join(',') : String(value));
      }
    });
    navigate(`?${params.toString()}`, { replace: true });
  }, [filters, navigate]);


  const { data: artworks, isLoading, error } = useQuery<AppArtwork[], Error>({ // Use AppArtwork
    queryKey: ["artworks", user?.id], // Add user?.id to query key for RLS
    queryFn: async () => {
      if (!user?.id) {
        console.log("ArtworkListPage: Query skipped - user ID not available."); // Query Log 1 (Skipped)
        return [];
      }
      console.log("ArtworkListPage: Fetching artworks for user:", user.id); // Query Log 1 (Initiated)
      const { data, error } = await supabase
        .from("artworks")
        .select(`
          id, slug, title, price, currency, genre, keywords, dominant_colors, status, color_groups, created_at,
          subject, orientation, dimensions, framing_info, signature_info, edition_info,
          description, inventory_number, provenance, location, medium, private_note,
          artwork_images ( id, image_url, watermarked_image_url, visualization_image_url, position, is_primary ),
          artwork_catalogue_junction (
            catalogue:catalogues ( id, title, slug )
          )
        `)
        .eq('user_id', user.id) // Ensure RLS for current user
        .order("created_at", { ascending: false });

      if (error) {
        console.error("ArtworkListPage: Supabase error fetching artworks:", error); // Query Log 2 (Error)
        toast.error(`Failed to load artworks: ${error.message}`);
        throw new Error(error.message);
      }
      console.log("ArtworkListPage: Supabase returned artworks (raw):", data); // Query Log 2 (Success)
      return data?.map(art => ({
          ...art,
          artwork_images: (art.artwork_images || []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
      })) as AppArtwork[] || [];
    },
    enabled: !!user?.id, // Only run query if user is available
  });

  const filteredArtworks = useMemo(() => {
    console.log("ArtworkListPage: useMemo - Artworks before filtering (from query):", artworks); // Filter Log 1

    if (!artworks) {
        console.log("ArtworkListPage: useMemo - No artworks data yet, returning empty array.");
        return [];
    }

    const normalizeStatus = (s: AppArtwork["status"]) =>
      s?.toLowerCase() === "available"
        ? "available"
        : ["pending", "on hold", "sold"].includes(s?.toLowerCase() ?? "")
        ? "draft" // Group these into 'draft' for internal display/filter purposes if desired
        : s?.toLowerCase() ?? "";

    const filtered = artworks
      .filter((a) => {
        // --- START FILTER DEBUG ---
        // console.log(`Filtering artwork ${a.title}:`);
        // if (filters.genre.length && !filters.genre.includes(a.genre ?? "")) { /* console.log('  - Failed genre'); */ return false; }
        // if (filters.status.length && !filters.status.includes(normalizeStatus(a.status))) { /* console.log('  - Failed status'); */ return false; }
        // if (filters.keyword.length && !a.keywords?.some((k) => filters.keyword.includes(k))) { /* console.log('  - Failed keyword'); */ return false; }
        // if (filters.color.length && !a.color_groups?.some((c) => filters.color.includes(c))) { /* console.log('  - Failed color'); */ return false; }
        // if (filters.medium && filters.medium.length && !filters.medium.includes(a.medium ?? "")) { /* console.log('  - Failed medium'); */ return false; }
        // if (filters.priceMin !== undefined && (a.price ?? 0) < filters.priceMin) { /* console.log('  - Failed priceMin'); */ return false; }
        // if (filters.priceMax !== undefined && (a.price ?? 0) > filters.priceMax) { /* console.log('  - Failed priceMax'); */ return false; }
        // if (a.created_at) {
        //   const creationYear = new Date(a.created_at).getFullYear();
        //   if (filters.creationYearMin !== undefined && creationYear < filters.creationYearMin) { /* console.log('  - Failed creationYearMin'); */ return false; }
        //   if (filters.creationYearMax !== undefined && creationYear > filters.creationYearMax) { /* console.log('  - Failed creationYearMax'); */ return false; }
        // }
        // if (filters.subjectSearch && !(a.subject?.toLowerCase().includes(filters.subjectSearch.toLowerCase()))) { /* console.log('  - Failed subjectSearch'); */ return false; }
        // if (filters.orientation.length > 0 && !(filters.orientation.includes(a.orientation ?? ''))) { /* console.log('  - Failed orientation'); */ return false; }
        // if (filters.isFramed !== null) {
        //   if (filters.isFramed === true && (!a.framing_info?.is_framed)) { /* console.log('  - Failed isFramed true'); */ return false; }
        //   if (filters.isFramed === false && (a.framing_info?.is_framed)) { /* console.log('  - Failed isFramed false'); */ return false; }
        // }
        // if (filters.isSigned !== null) {
        //   if (filters.isSigned === true && (!a.signature_info?.is_signed)) { /* console.log('  - Failed isSigned true'); */ return false; }
        //   if (filters.isSigned === false && (a.signature_info?.is_signed)) { /* console.log('  - Failed isSigned false'); */ return false; }
        // }
        // if (filters.isEdition !== null) {
        //   if (filters.isEdition === true && (!a.edition_info?.is_edition)) { /* console.log('  - Failed isEdition true'); */ return false; }
        //   if (filters.isEdition === false && (a.edition_info?.is_edition)) { /* console.log('  - Failed isEdition false'); */ return false; }
        // }
        // if (filters.minHeight !== undefined && (a.dimensions?.height ?? 0) < filters.minHeight) { /* console.log('  - Failed minHeight'); */ return false; }
        // if (filters.maxHeight !== undefined && (a.dimensions?.height ?? 0) > filters.maxHeight) { /* console.log('  - Failed maxHeight'); */ return false; }
        // if (filters.minWidth !== undefined && (a.dimensions?.width ?? 0) < filters.minWidth) { /* console.log('  - Failed minWidth'); */ return false; }
        // if (filters.maxWidth !== undefined && (a.dimensions?.width ?? 0) > filters.maxWidth) { /* console.log('  - Failed maxWidth'); */ return false; }
        // if (filters.minDepth !== undefined && (a.dimensions?.depth ?? 0) < filters.minDepth) { /* console.log('  - Failed minDepth'); */ return false; }
        // if (filters.maxDepth !== undefined && (a.dimensions?.depth ?? 0) > filters.maxDepth) { /* console.log('  - Failed maxDepth'); */ return false; }
        // if (filters.search) {
        //   const q = filters.search.toLowerCase();
        //   const searchableFields = [
        //     a.title, a.description, a.genre, a.medium, a.subject, a.orientation, a.inventory_number,
        //     a.provenance, a.location, a.framing_info?.details, a.signature_info?.location,
        //     a.signature_info?.details, ...(a.keywords || []), ...(a.dominant_colors || []),
        //     ...(a.color_groups || []), ...(a.artwork_catalogue_junction?.map(junction => junction.catalogue?.title) || []),
        //   ].filter(Boolean).map(String);
        //   const match = searchableFields.some(field => field.toLowerCase().includes(q));
        //   if (!match) { /* console.log('  - Failed search'); */ return false; }
        // }
        // console.log(`  - Passed filtering`);
        // --- END FILTER DEBUG ---

        // Actual filter logic
        if (filters.genre.length && !filters.genre.includes(a.genre ?? "")) return false;
        if (filters.status.length && !filters.status.includes(normalizeStatus(a.status))) return false;
        if (filters.keyword.length && !a.keywords?.some((k) => filters.keyword.includes(k))) return false;
        if (filters.color.length && !a.color_groups?.some((c) => filters.color.includes(c))) return false;
        if (filters.medium && filters.medium.length && !filters.medium.includes(a.medium ?? "")) return false;

        if (filters.priceMin !== undefined && (a.price ?? 0) < filters.priceMin) return false;
        if (filters.priceMax !== undefined && (a.price ?? 0) > filters.priceMax) return false;

        if (a.created_at) {
          const creationYear = new Date(a.created_at).getFullYear();
          if (filters.creationYearMin !== undefined && creationYear < filters.creationYearMin) return false;
          if (filters.creationYearMax !== undefined && creationYear > filters.creationYearMax) return false;
        }

        if (filters.subjectSearch && !(a.subject?.toLowerCase().includes(filters.subjectSearch.toLowerCase()))) return false;
        if (filters.orientation.length > 0 && !(filters.orientation.includes(a.orientation ?? ''))) return false;

        if (filters.isFramed !== null) {
          if (filters.isFramed === true && (!a.framing_info?.is_framed)) return false;
          if (filters.isFramed === false && (a.framing_info?.is_framed)) return false;
        }

        if (filters.isSigned !== null) {
          if (filters.isSigned === true && (!a.signature_info?.is_signed)) return false;
          if (filters.isSigned === false && (a.signature_info?.is_signed)) return false;
        }

        if (filters.isEdition !== null) {
          if (filters.isEdition === true && (!a.edition_info?.is_edition)) return false;
          if (filters.isEdition === false && (a.edition_info?.is_edition)) return false;
        }

        // Dimensions filters
        if (filters.minHeight !== undefined && (a.dimensions?.height ?? 0) < filters.minHeight) return false;
        if (filters.maxHeight !== undefined && (a.dimensions?.height ?? 0) > filters.maxHeight) return false;
        if (filters.minWidth !== undefined && (a.dimensions?.width ?? 0) < filters.minWidth) return false;
        if (filters.maxWidth !== undefined && (a.dimensions?.width ?? 0) > filters.maxWidth) return false;
        if (filters.minDepth !== undefined && (a.dimensions?.depth ?? 0) < filters.minDepth) return false;
        if (filters.maxDepth !== undefined && (a.dimensions?.depth ?? 0) > filters.maxDepth) return false;


        // General Search - now searches all text fields *except* private_note
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const searchableFields = [
            a.title,
            a.description,
            a.genre,
            a.medium,
            a.subject,
            a.orientation,
            a.inventory_number,
            a.provenance,
            a.location,
            a.framing_info?.details,
            a.signature_info?.location,
            a.signature_info?.details,
            ...(a.keywords || []),
            ...(a.dominant_colors || []),
            ...(a.color_groups || []),
            ...(a.artwork_catalogue_junction?.map(junction => junction.catalogue?.title) || []),
          ].filter(Boolean).map(String);

          const match = searchableFields.some(field => field.toLowerCase().includes(q));
          if (!match) return false;
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
          case "newest": // Default sort is newest from query, no additional sort needed unless overridden
          default:
            return 0;
        }
      });
    
    console.log("ArtworkListPage: useMemo - Artworks after filtering and sorting:", filtered.length, filtered); // Filter Log 2
    return filtered;

  }, [artworks, filters]);

  // --- Bulk Actions ---
  const handleSelectArtwork = (id: string) => {
      setSelectedArtworkIds(prev =>
          prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
      );
  };

  const handleApplyBulkAction = (action: string) => {
      if (!user?.id) return;
      toast.info(`Applying bulk action '${action}' to ${selectedArtworkIds.length} artworks... (Feature not fully implemented)`);
      console.log(`Bulk Action: ${action} for IDs:`, selectedArtworkIds);

      // Example: Bulk delete (replace with actual Supabase calls)
      if (action === 'delete' && window.confirm('Are you sure you want to delete selected artworks?')) {
          // Placeholder for actual delete mutation
          // supabase.from('artworks').delete().in('id', selectedArtworkIds).eq('user_id', user.id);
          queryClient.invalidateQueries({ queryKey: ['artworks', user.id] });
          toast.success("Artworks deletion initiated.");
          setSelectedArtworkIds([]);
      }
      // Add logic for 'mark-available', 'mark-sold', 'add-tags' etc.
  };

  console.log("ArtworkListPage: Before rendering main JSX. isLoading:", isLoading, "error:", error, "filteredArtworks count:", filteredArtworks.length); // Render Log 1

  if (authLoading) { // Check auth loading first
      console.log("ArtworkListPage: Auth is still loading.");
      return <p className="loading-message">Loading authentication...</p>;
  }

  if (!user) { // If user is not authenticated, redirect or show message (should be handled by ProtectedRoute)
      console.log("ArtworkListPage: User not authenticated, redirecting or showing login prompt.");
      return <p className="error-message">Please log in to view your artworks.</p>;
  }

  if (isLoading) {
      console.log("ArtworkListPage: Data is still loading (isLoading is true).");
      return <p className="loading-message">Loading artworks...</p>;
  }
  if (error) {
      console.error("ArtworkListPage: Error in useQuery:", error);
      return <p className="error-message">Error loading artworks: {error.message}</p>;
  }

  // Empty state for artist without artworks, or if filters hide all.
  // Note: This conditional renders *after* isLoading and error checks.
  if ((!artworks || artworks.length === 0) && filteredArtworks.length === 0) {
      console.log("ArtworkListPage: No artworks found for this user, showing empty state.");
      return (
          <div className="empty-state-card">
              <p className="text-muted-foreground">You haven't uploaded any artworks yet.</p>
              <Link to="/u/artworks/wizard" className="button button-primary mt-4 button-with-icon">
                  <PlusCircle size={16} /> Create Your First Artwork
              </Link>
              <button onClick={() => setShowCsvImportModal(true)} className="button button-secondary mt-2 button-with-icon">
                  <Upload size={16} /> Import Artworks from CSV
              </button>
          </div>
      );
  }


  return (
    <div className="page-container artwork-list-page">
        <CsvImportModal
            isOpen={showCsvImportModal}
            onClose={() => setShowCsvImportModal(false)}
            onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ['artworks', user?.id] })}
            userId={user!.id}
        />
        <BulkActionsModal
            isOpen={showBulkActionsModal}
            onClose={() => setShowBulkActionsModal(false)}
            selectedArtworkIds={selectedArtworkIds}
            onApplyAction={handleApplyBulkAction}
        />

      <div className="page-header-row">
        <h1>My Artworks</h1>
        <div className="actions-group">
            <button onClick={() => setShowCsvImportModal(true)} className="button button-secondary button-with-icon">
                <Upload size={16} /> Import CSV
            </button>
            <Link to="/u/artworks/wizard" className="button button-primary button-with-icon">+ New Artwork</Link>
        </div>
      </div>

      {/* Active Filters Display */}
      {Object.values(filters).some(val => (Array.isArray(val) && val.length > 0) || (typeof val === 'string' && val !== '' && val !== 'newest') || (typeof val === 'number') || (typeof val === 'boolean' && val !== null)) && (
          <div className="active-filters-display">
              <h3 className="text-sm font-semibold mr-2">Active Filters:</h3>
              {Object.entries(filters).map(([key, value]) => {
                  if ((Array.isArray(value) && value.length > 0) || (typeof value === 'string' && value !== '' && value !== 'newest') || (typeof value === 'number') || (typeof value === 'boolean' && value !== null)) {
                      const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                      const displayValue = Array.isArray(value) ? value.join(',') : String(value);
                      return (
                          <span key={key} className="filter-pill">
                              {displayKey}: {displayValue}
                              <button onClick={() => setFilters(prev => ({ ...prev, [key]: Array.isArray(prev[key as keyof Filters]) ? [] : (typeof prev[key as keyof Filters] === 'boolean' ? null : (key === 'sort' ? 'newest' : '')) }))} className="filter-pill-clear">
                                  <XCircle size={14} />
                              </button>
                          </span>
                      );
                  }
                  return null;
              })}
              <button onClick={() => setFilters({ genre: [], status: [], keyword: [], color: [], medium: [], search: "", sort: "newest", priceMin: undefined, priceMax: undefined, creationYearMin: undefined, creationYearMax: undefined, subjectSearch: "", orientation: [], isFramed: null, isSigned: null, isEdition: null, minHeight: undefined, maxHeight: undefined, minWidth: undefined, maxWidth: undefined, minDepth: undefined, maxDepth: undefined })} className="button button-secondary button-sm ml-4">Clear All</button>
          </div>
      )}


      <div className="artwork-list-layout">
        {/* Mobile Filter Toggle */}
        <button className="button button-secondary mb-4 md:hidden" onClick={() => setIsSidebarOpen(true)}>
            <Settings size={16} className="mr-2"/> Toggle Filters
        </button>

        {/* Filter Sidebar */}
        <div className={`filter-sidebar ${isSidebarOpen ? 'open' : ''}`}>
            <FiltersSidebar artworks={artworks || []} filters={filters} setFilters={setFilters} isArtistView={true} />
            <button className="close-sidebar-button md:hidden" onClick={() => setIsSidebarOpen(false)}>
                <XCircle size={24} />
            </button>
        </div>
        {isSidebarOpen && <div className="sidebar-backdrop md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

        <div className="artwork-list-main-content">
            {/* Bulk Actions Bar */}
            {selectedArtworkIds.length > 0 && (
                <div className="bulk-actions-bar mb-4">
                    <span>{selectedArtworkIds.length} artworks selected</span>
                    <button onClick={() => setShowBulkActionsModal(true)} className="button button-secondary button-sm button-with-icon">
                        <Tag size={16} /> Apply Bulk Action
                    </button>
                    {/* Add more direct bulk actions if needed, e.g., Mark Available */}
                </div>
            )}

            <div className="artwork-grid">
                {filteredArtworks.length > 0 ? (
                    filteredArtworks.map((art) => {
                        const primaryImage = art.artwork_images?.[0]?.image_url ?? "https://placehold.co/600x450?text=No+Image";
                        const catalogue = art.artwork_catalogue_junction?.[0]?.catalogue;

                        const editHref = `/u/artworks/edit/${art.id}`;
                        const publicUrl = profile?.slug && art.slug ? `${window.location.origin}/u/${profile.slug}/artwork/${art.slug}` : null;

                        return (
                            <div key={art.id} className="artwork-card">
                                <div className="artwork-card-image-wrapper">
                                    <img src={primaryImage} alt={art.title ?? "Artwork"} className="artwork-card-image" />
                                    <div className="artwork-card-status-badge">{String(art.status)}</div>
                                    {art.status === 'draft' && <div className="artwork-card-draft-prompt">Draft: Complete details to make available.</div>}
                                    <input
                                        type="checkbox"
                                        className="bulk-select-checkbox"
                                        checked={selectedArtworkIds.includes(art.id)}
                                        onChange={() => handleSelectArtwork(art.id)}
                                        title="Select for bulk actions"
                                    />
                                </div>
                                <div className="artwork-card-info">
                                    <h3>{art.title ?? "Untitled"}</h3>
                                    {art.price != null && (
                                        <p className="artwork-card-price">
                                            {(art.currency ?? "USD")} {art.price.toLocaleString()}
                                        </p>
                                    )}
                                    {art.genre && <p className="artwork-card-meta">Genre: {art.genre}</p>}
                                    {art.medium && <p className="artwork-card-meta">Medium: {art.medium}</p>}
                                    {art.subject && <p className="artwork-card-meta">Subject: {art.subject}</p>}
                                    {catalogue && catalogue.slug && (
                                        <p className="artwork-card-meta">
                                            Part of Catalogue: <Link to={`/u/${profile?.slug}/catalogue/${catalogue.slug}`} className="text-link">{catalogue.title}</Link>
                                        </p>
                                    )}
                                     {art.dimensions?.height && art.dimensions?.width && (
                                        <p className="artwork-card-meta">Dimensions: {art.dimensions.height} x {art.dimensions.width}{art.dimensions.depth ? ` x ${art.dimensions.depth}` : ''} {art.dimensions.unit}</p>
                                    )}
                                    {art.framing_info?.is_framed && <p className="artwork-card-meta">Framed: Yes</p>}
                                </div>
                                <div className="artwork-card-actions">
                                    <Link to={editHref} className="button button-secondary button-sm">Edit</Link>
                                    {publicUrl && <ShareButton
                                        shareUrl={publicUrl}
                                        title={art.title || "Artwork"}
                                        byline={profile?.full_name || ""}
                                        previewImageUrls={[primaryImage]}
                                    />}
                                    <ArtworkActionsMenu artwork={art} />
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="empty-state-card col-span-full">
                        <p className="text-muted-foreground">No artworks found matching your current filters.</p>
                        <button onClick={() => setFilters({ genre: [], status: [], keyword: [], color: [], medium: [], search: "", sort: "newest", priceMin: undefined, priceMax: undefined, creationYearMin: undefined, creationYearMax: undefined, subjectSearch: "", orientation: [], isFramed: null, isSigned: null, isEdition: null, minHeight: undefined, maxHeight: undefined, minWidth: undefined, maxWidth: undefined, minDepth: undefined, maxDepth: undefined })} className="button button-secondary mt-4">Clear Filters</button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}