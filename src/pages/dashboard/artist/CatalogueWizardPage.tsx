import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthProvider";
import toast from "react-hot-toast";
import { Lock, Eye, Users, Calendar, ArrowUp, ArrowDown, XCircle, Clock, Plus, GripVertical } from 'lucide-react';
import { AppArtwork, AppArtworkWithJunction, CatalogueRow, ContactRow, AppCatalogue, TagRow } from '@/types/app.types';
import { LocationJson, SocialLinkJson } from '@/types/database.types'; // For location type in profile for audience groups
import '@/styles/app.css'; // Import the centralized styles

// --- Data Fetching for Audience Groups ---
const fetchAudienceGroups = async (userId: string): Promise<TagRow[]> => {
    // In a real application, you'd fetch dedicated 'audience groups' from a table.
    // For now, let's simulate by using 'tags' that are user-defined.
    const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
};

// --- Helper Components ---

// Component for managing artworks within the catalogue
interface ArtworkManagerProps {
  catalogueId: string | undefined;
  userId: string;
  initialCatalogueArtworks: AppArtworkWithJunction[];
  allAvailableArtworks: AppArtwork[];
  isLoading: boolean;
  isError: boolean;
  onArtworksChange: (artworks: AppArtworkWithJunction[]) => void;
}

const ArtworkManager: React.FC<ArtworkManagerProps> = React.memo(({
  catalogueId,
  userId,
  initialCatalogueArtworks,
  allAvailableArtworks,
  isLoading,
  isError,
  onArtworksChange,
}) => {
  const [currentCatalogueArtworks, setCurrentCatalogueArtworks] = useState<AppArtworkWithJunction[]>([]);
  const [selectedArtworkToAdd, setSelectedArtworkToAdd] = useState<string>('');

  // Update internal state when initialCatalogueArtworks changes (e.g., on initial load or save)
  useEffect(() => {
    // Ensure initial artworks are sorted by position
    setCurrentCatalogueArtworks(initialCatalogueArtworks.sort((a,b) => a.position - b.position));
  }, [initialCatalogueArtworks]);

  const handleAddArtwork = () => {
    if (selectedArtworkToAdd) {
      const artworkToAdd = allAvailableArtworks.find(a => a.id === selectedArtworkToAdd);
      if (artworkToAdd && !currentCatalogueArtworks.some(ca => ca.id === artworkToAdd.id)) {
        const newArtwork: AppArtworkWithJunction = {
          ...artworkToAdd,
          position: currentCatalogueArtworks.length, // Assign next available position (0-indexed)
        };
        const updatedArtworks = [...currentCatalogueArtworks, newArtwork];
        setCurrentCatalogueArtworks(updatedArtworks);
        onArtworksChange(updatedArtworks);
        setSelectedArtworkToAdd(''); // Clear selection
      } else if (artworkToAdd) {
          toast.info(`${artworkToAdd.title} is already in the catalogue.`);
      }
    }
  };

  const handleRemoveArtwork = (artworkId: string) => {
    const updatedArtworks = currentCatalogueArtworks.filter(a => a.id !== artworkId);
    // Reassign positions after removal to maintain sequential order
    const reorderedArtworks = updatedArtworks.map((a, index) => ({ ...a, position: index }));
    setCurrentCatalogueArtworks(reorderedArtworks);
    onArtworksChange(reorderedArtworks);
  };

  const handleMoveArtwork = (artworkId: string, direction: 'up' | 'down') => {
    const index = currentCatalogueArtworks.findIndex(a => a.id === artworkId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentCatalogueArtworks.length) return; // Out of bounds

    const updatedArtworks = [...currentCatalogueArtworks];
    const [movedArtwork] = updatedArtworks.splice(index, 1);
    updatedArtworks.splice(newIndex, 0, movedArtwork);

    // Reassign positions based on new order
    const reorderedArtworks = updatedArtworks.map((a, idx) => ({ ...a, position: idx }));
    setCurrentCatalogueArtworks(reorderedArtworks);
    onArtworksChange(reorderedArtworks);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault(); // Allow drop
  };

  const handleDrop = (e: React.DragEvent<HTMLLIElement>, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);

    if (dragIndex === dropIndex) return;

    const updatedArtworks = [...currentCatalogueArtworks];
    const [movedArtwork] = updatedArtworks.splice(dragIndex, 1);
    updatedArtworks.splice(dropIndex, 0, movedArtwork);

    const reorderedArtworks = updatedArtworks.map((a, idx) => ({ ...a, position: idx }));
    setCurrentCatalogueArtworks(reorderedArtworks);
    onArtworksChange(reorderedArtworks);
  };


  const availableArtworksForSelection = useMemo(() => {
    return allAvailableArtworks.filter(
      (a) => !currentCatalogueArtworks.some((ca) => ca.id === a.id)
    );
  }, [allAvailableArtworks, currentCatalogueArtworks]);


  return (
    <div className="artwork-manager-section">
      <h3 className="section-title">Artworks in this Catalogue</h3>
      {isLoading ? (
        <p className="loading-message">Loading available artworks...</p>
      ) : isError ? (
        <p className="error-message">Error loading artworks: Ensure images are correctly linked.</p>
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            <select
              value={selectedArtworkToAdd}
              onChange={(e) => setSelectedArtworkToAdd(e.target.value)}
              className="input flex-grow"
              disabled={availableArtworksForSelection.length === 0}
            >
              <option value="">Select artwork to add</option>
              {availableArtworksForSelection.length === 0 && <option disabled>No more artworks to add</option>}
              {availableArtworksForSelection.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddArtwork}
              disabled={!selectedArtworkToAdd}
              className="button button-secondary min-w-[80px]"
            >
              Add
            </button>
          </div>

          <div className="artwork-list-scroll-area">
            {currentCatalogueArtworks.length === 0 ? (
              <p className="empty-chart-message">No artworks currently in this catalogue.</p>
            ) : (
              <ul className="space-y-2">
                {currentCatalogueArtworks.sort((a,b) => a.position - b.position).map((art, index) => (
                  <li
                    key={art.id}
                    className="artwork-manager-list-item"
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    <GripVertical size={18} className="drag-handle" />
                    <img src={art.artwork_images?.[0]?.image_url || 'https://placehold.co/50x50?text=No+Img'} alt={art.title || 'Artwork'} className="artwork-list-item-image" />
                    <span className="font-medium text-foreground">{art.title}</span>
                    <span className="text-sm text-muted-foreground">(Pos: {art.position + 1})</span>
                    <div className="artwork-list-item-actions">
                      <button
                        type="button"
                        onClick={() => handleMoveArtwork(art.id, 'up')}
                        disabled={index === 0}
                        className="button-icon text-primary hover:bg-primary-hover p-1"
                        title="Move Up"
                      >
                        <ArrowUp size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveArtwork(art.id, 'down')}
                        disabled={index === currentCatalogueArtworks.length - 1}
                        className="button-icon text-primary hover:bg-primary-hover p-1"
                        title="Move Down"
                      >
                        <ArrowDown size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveArtwork(art.id)}
                        className="button-icon text-red-500 hover:bg-red-100 p-1"
                        title="Remove"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
});


// Component for selecting audience from contacts and audience groups
interface AudienceSelectorProps {
  userId: string;
  initialAudienceIds: string[];
  onAudienceChange: (ids: string[]) => void;
}

const AudienceSelector: React.FC<AudienceSelectorProps> = React.memo(({
  userId,
  initialAudienceIds,
  onAudienceChange,
}) => {
  const [selectedContacts, setSelectedContacts] = useState<string[]>(initialAudienceIds);

  useEffect(() => {
    setSelectedContacts(initialAudienceIds);
  }, [initialAudienceIds]);

  const { data: contacts, isLoading: isLoadingContacts, isError: isErrorContacts, error: contactsError } = useQuery<ContactRow[], Error>({
    queryKey: ["userContacts", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, full_name, email")
        .eq("user_id", userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // Cache contacts for 10 min
  });

  const { data: audienceGroups, isLoading: isLoadingGroups, isError: isErrorGroups, error: groupsError } = useQuery<TagRow[], Error>({
    queryKey: ["audienceGroups", userId],
    queryFn: () => fetchAudienceGroups(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 60, // Cache groups for 1 hour
  });

  const handleContactToggle = (contactId: string) => {
    const updatedSelection = selectedContacts.includes(contactId)
      ? selectedContacts.filter(id => id !== contactId)
      : [...selectedContacts, contactId];
    setSelectedContacts(updatedSelection);
    onAudienceChange(updatedSelection);
  };

  const handleGroupToggle = (groupId: string) => {
      // Logic to add/remove all contacts associated with this group
      // This would require fetching contacts by group (e.g., from contact_tags junction table)
      toast.info(`Audience Group selection not fully implemented. (Group ID: ${groupId})`);
      // For now, it's just a placeholder for the UI
  };

  if (isLoadingContacts || isLoadingGroups) return <p className="loading-message">Loading contacts and groups...</p>;
  if (isErrorContacts) return <p className="error-message">Error loading contacts: {contactsError?.message}</p>;
  if (isErrorGroups) return <p className="error-message">Error loading groups: {groupsError?.message}</p>;

  return (
    <div className="audience-selector-section">
      <h3 className="section-title">Select Audience</h3>
      <p className="text-sm font-medium text-foreground mb-2">Choose specific contacts or groups to share with:</p>

      {audienceGroups && audienceGroups.length > 0 && (
          <div className="mb-4">
              <h4 className="font-semibold text-sm mb-2">Audience Groups:</h4>
              <div className="checkbox-list audience-group-list">
                  {audienceGroups.map(group => (
                      <div key={group.id} className="checkbox-item">
                          <input
                              type="checkbox"
                              id={`group-${group.id}`}
                              // checked={allContactsInGroupSelected} // Complex logic
                              onChange={() => handleGroupToggle(group.id)}
                              className="checkbox"
                          />
                          <label htmlFor={`group-${group.id}`} className="cursor-pointer text-foreground">
                              {group.name}
                          </label>
                      </div>
                  ))}
              </div>
          </div>
      )}

      <h4 className="font-semibold text-sm mb-2">Individual Contacts:</h4>
      <div className="contact-list-scroll-area">
        {contacts && contacts.length > 0 ? (
          contacts.map(contact => (
            <div key={contact.id} className="checkbox-item">
              <input
                type="checkbox"
                id={`contact-${contact.id}`}
                checked={selectedContacts.includes(contact.id)}
                onChange={() => handleContactToggle(contact.id)}
                className="checkbox"
              />
              <label htmlFor={`contact-${contact.id}`} className="cursor-pointer text-foreground">
                {contact.full_name} ({contact.email})
              </label>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground text-sm">No contacts found. Go to 'Contacts' to add some.</p>
        )}
      </div>
    </div>
  );
});

// --- Main CatalogueWizardPage Component ---
export default function CatalogueWizardPage() {
  const { catalogueId } = useParams<{ catalogueId: string }>();
  const isEditing = !!catalogueId;
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverArtworkId, setCoverArtworkId] = useState<string | null>(null);
  const [isSystem, setIsSystem] = useState(false);
  const [accessType, setAccessType] = useState<CatalogueRow['access_type']>("public");
  const [password, setPassword] = useState("");
  const [scheduledSendDate, setScheduledSendDate] = useState<string>('');
  const [scheduledSendTime, setScheduledSendTime] = useState<string>('');
  const [scheduledSendTimezone, setScheduledSendTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone);

  const [catalogueArtworks, setCatalogueArtworks] = useState<AppArtworkWithJunction[]>([]);
  const [restrictedAudienceIds, setRestrictedAudienceIds] = useState<string[]>([]);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Query for all artworks to populate the Cover Artwork dropdown AND ArtworkManager
  const { data: allAvailableArtworks, isLoading: isLoadingAllArtworks, isError: isErrorAllArtworks, error: allArtworksError } = useQuery<AppArtwork[], Error>({
    queryKey: ["allUserArtworks", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("artworks")
        .select("id, title, artwork_images(image_url, is_primary, position)") // Select images
        .eq("user_id", user.id)
        .in("status", ["available", "sold"]); // Use harmonized status
      if (error) {
        console.error("Error fetching all artworks:", error);
        throw new Error(error.message);
      }
      return data?.map(art => ({
        ...art,
        artwork_images: art.artwork_images?.filter((img: any) => img.is_primary) || [], // Ensure only primary images or empty array
      })) as AppArtwork[] || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Query for the existing catalogue data and its associated artworks/audience if in editing mode
  const {
    data: fetchedCatalogueData,
    isLoading: isLoadingCatalogue,
    isError: isErrorCatalogue,
    error: catalogueError,
  } = useQuery<AppCatalogue | null, Error>({
    queryKey: ["catalogue", catalogueId],
    queryFn: async () => {
      if (!catalogueId || !user?.id) return null;
      const { data, error } = await supabase
        .from("catalogues")
        .select(`
          *,
          artist:profiles(id, full_name, slug),
          artwork_catalogue_junction!left(artwork_id, position, id),
          catalogue_audience_junction!left(contact_id)
        `)
        .eq("id", catalogueId)
        .eq("user_id", user.id) // Ensure user owns the catalogue for editing
        .single();

      if (error) {
        console.error("Error fetching existing catalogue:", error);
        if (error.code === 'PGRST116' || error.message.includes('0 rows') || error.message.includes('policy')) {
            return null; // Treat as not found/no access
        }
        throw error;
      }
      if (!data) return null;

      // Fetch full artwork details for associated artworks
      let linkedArtworks: AppArtworkWithJunction[] = [];
      if (data.artwork_catalogue_junction && data.artwork_catalogue_junction.length > 0) {
        const artworkIds = data.artwork_catalogue_junction.map((j: { artwork_id: string }) => j.artwork_id);
        const { data: artworksData, error: artworksError } = await supabase
          .from('artworks')
          .select('id, title, artwork_images(image_url, is_primary, position)') // Select images
          .in('id', artworkIds);

        if (artworksError) throw artworksError;

        linkedArtworks = data.artwork_catalogue_junction.map((junction: any) => {
            const artworkDetail = artworksData?.find(a => a.id === junction.artwork_id);
            if (artworkDetail) {
              const primaryImage = (artworkDetail.artwork_images as any[])?.find(img => img.is_primary) || artworkDetail.artwork_images?.[0];
              return {
                ...artworkDetail,
                artwork_images: primaryImage ? [primaryImage] : [],
                position: junction.position,
                junction_id: junction.id
              } as AppArtworkWithJunction;
            }
            return null;
        }).filter(Boolean) as AppArtworkWithJunction[];
      }

      // Process audience IDs
      const linkedAudienceIds = data.catalogue_audience_junction
        ? data.catalogue_audience_junction.map((j: { contact_id: string }) => j.contact_id)
        : [];

      return { ...data, linkedArtworks, linkedAudienceIds } as AppCatalogue;
    },
    enabled: isEditing && !!user?.id && !!catalogueId,
    staleTime: 0,
    retry: false,
  });

  // Effect to populate form fields when existing data loads
  useEffect(() => {
    if (fetchedCatalogueData) {
      const cat = fetchedCatalogueData;
      setTitle(cat.title || "");
      setDescription(cat.description || "");
      setIsSystem(cat.is_system_catalogue || false);
      setCoverArtworkId(cat.cover_artwork_id || null);
      setAccessType(cat.access_type || "public");
      setPassword(cat.password || "");

      if (cat.scheduled_send_at) {
        const sendDate = new Date(cat.scheduled_send_at);
        setScheduledSendDate(sendDate.toISOString().split('T')[0]);
        // Convert stored UTC time to local time based on the selected timezone for display
        const localTime = new Date(sendDate.toLocaleString('en-US', { timeZone: scheduledSendTimezone })).toTimeString().split(' ')[0].substring(0, 5);
        setScheduledSendTime(localTime);
      } else {
        setScheduledSendDate('');
        setScheduledSendTime('');
      }

      setCatalogueArtworks(fetchedCatalogueData.linkedArtworks || []);
      setRestrictedAudienceIds(fetchedCatalogueData.linkedAudienceIds || []);
    } else if (!isEditing) {
        // Clear form when creating a new catalogue (not editing)
        setTitle("");
        setDescription("");
        setIsSystem(false);
        setCoverArtworkId(null);
        setAccessType("public");
        setPassword("");
        setScheduledSendDate('');
        setScheduledSendTime('');
        setCatalogueArtworks([]);
        setRestrictedAudienceIds([]);
    }
  }, [fetchedCatalogueData, isEditing, scheduledSendTimezone]);


  // Handle redirection for not found/error in editing mode (React Warning Fix)
  useEffect(() => {
    if (isEditing && !isLoadingCatalogue && catalogueId) {
        if (!fetchedCatalogueData && !catalogueError) {
            toast.error("Catalogue not found or you do not have permission to edit it.");
            navigate("/u/catalogues", { replace: true });
        } else if (isErrorCatalogue) {
            toast.error(`Error loading catalogue: ${catalogueError?.message || 'Unknown error'}`);
            navigate("/u/catalogues", { replace: true });
        }
    }
  }, [isEditing, isLoadingCatalogue, fetchedCatalogueData, isErrorCatalogue, catalogueError, navigate, catalogueId]);


  // --- Form Validation Logic ---
  const validateForm = () => {
      const newErrors: Record<string, string> = {};
      if (!title.trim()) newErrors.title = "Catalogue title cannot be empty.";
      if (accessType === "password_protected" && !password.trim()) {
          newErrors.password = "Password is required for password protected catalogues.";
      }
      if (accessType === "restricted_audience" && restrictedAudienceIds.length === 0) {
          newErrors.restrictedAudienceIds = "At least one contact must be selected for restricted audience.";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };


  // Mutation to save (create or update) the catalogue
  const saveMutation = useMutation<string, Error, void>({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      if (!validateForm()) throw new Error("Please correct the errors in the form.");

      // If access type changes from password_protected, clear password (handled by UI state, but confirm before save)
      const finalPassword = accessType === "password_protected" ? password.trim() : null;

      let scheduled_at_datetime: string | null = null;
      if (scheduledSendDate && scheduledSendTime) {
        try {
          // Construct date object using local time of selected timezone
          // This ensures the local time the user chose is correctly converted to UTC for storage
          const localDateTimeString = `${scheduledSendDate}T${scheduledSendTime}:00`;
          const date = new Date(localDateTimeString); // This parses as local time in the browser's default timezone
          // We need to adjust it to assume it's in the *selected* timezone
          // This is a complex problem if you don't use a dedicated timezone library like `luxon` or `moment-timezone`.
          // For simplicity, here, we will take the input date and time, interpret it as UTC directly for storage,
          // or assume it's in the *browser's* local timezone and convert to UTC.
          // A more robust solution involves passing `scheduledSendTimezone` to the backend for accurate conversion.
          // For now, let's assume the browser's local timezone for conversion.
          const utcDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
          scheduled_at_datetime = utcDate.toISOString();

          toast.info(`Scheduled for: ${localDateTimeString} in ${scheduledSendTimezone}. Stored as UTC: ${scheduled_at_datetime}`);

        } catch (e) {
          console.error("Error parsing scheduled date/time:", e);
          throw new Error("Invalid scheduled date or time format.");
        }
      }


      // Determine cover_image_url
      let catalogueCoverImageUrl: string | null = null;
      if (coverArtworkId && allAvailableArtworks) {
          const coverArtwork = allAvailableArtworks.find(a => a.id === coverArtworkId);
          catalogueCoverImageUrl = coverArtwork?.artwork_images?.[0]?.image_url || null;
      }

      const cataloguePayload: Partial<CatalogueRow> = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        is_system_catalogue: isSystem,
        cover_artwork_id: coverArtworkId,
        cover_image_url: catalogueCoverImageUrl,
        access_type: accessType,
        password: finalPassword,
        scheduled_send_at: scheduled_at_datetime,
        // is_published would likely be managed separately or by a workflow, not directly here.
      };

      let currentCatalogueId = catalogueId;

      if (isEditing) {
        const { error } = await supabase
          .from("catalogues")
          .update(cataloguePayload)
          .eq("id", catalogueId);
        if (error) throw error;
        currentCatalogueId = catalogueId;
      } else {
        const { data, error } = await supabase
          .from("catalogues")
          .insert(cataloguePayload as CatalogueRow)
          .select("id")
          .single();
        if (error) throw error;
        currentCatalogueId = data.id;
      }

      if (!currentCatalogueId) throw new Error("Failed to get catalogue ID after save.");

      // --- Handle Artwork_Catalogue_Junction (Add/Update/Remove) ---
      const existingJunctions = fetchedCatalogueData?.artwork_catalogue_junction || [];
      const artworkOperations: Promise<any>[] = [];

      for (const artwork of catalogueArtworks) {
        const existingJunction = existingJunctions.find((j: any) => j.artwork_id === artwork.id);
        if (existingJunction) {
          if (existingJunction.position !== artwork.position) {
            artworkOperations.push(
              supabase
                .from('artwork_catalogue_junction')
                .update({ position: artwork.position })
                .eq('catalogue_id', currentCatalogueId)
                .eq('artwork_id', artwork.id)
            );
          }
        } else {
          artworkOperations.push(
            supabase
              .from('artwork_catalogue_junction')
              .insert({
                catalogue_id: currentCatalogueId,
                artwork_id: artwork.id,
                position: artwork.position,
              })
          );
        }
      }

      const currentArtworkIdsInCatalogue = new Set(catalogueArtworks.map(a => a.id));
      for (const existingJunction of existingJunctions) {
        if (!currentArtworkIdsInCatalogue.has(existingJunction.artwork_id)) {
          artworkOperations.push(
            supabase
              .from('artwork_catalogue_junction')
              .delete()
              .eq('catalogue_id', currentCatalogueId)
              .eq('artwork_id', existingJunction.artwork_id)
          );
        }
      }
      await Promise.all(artworkOperations);


      // --- Handle Catalogue_Audience_Junction (Add/Remove) ---
      const existingAudienceJunctions = fetchedCatalogueData?.catalogue_audience_junction || [];
      const currentAudienceContactIds = new Set(restrictedAudienceIds);

      const audienceOperations: Promise<any>[] = [];

      for (const contactId of currentAudienceContactIds) {
        if (!existingAudienceJunctions.some((j: any) => j.contact_id === contactId)) {
          audienceOperations.push(
            supabase
              .from('catalogue_audience_junction')
              .insert({
                catalogue_id: currentCatalogueId,
                contact_id: contactId,
              })
          );
        }
      }

      for (const existingJunction of existingAudienceJunctions) {
        if (!currentAudienceContactIds.has(existingJunction.contact_id)) {
          audienceOperations.push(
            supabase
              .from('catalogue_audience_junction')
              .delete()
              .eq('catalogue_id', currentCatalogueId)
              .eq('contact_id', existingJunction.contact_id)
          );
        }
      }
      await Promise.all(audienceOperations);


      return currentCatalogueId;
    },
    onSuccess: (id) => {
      toast.success(`Catalogue ${isEditing ? "updated" : "created"} successfully!`);
      qc.invalidateQueries({ queryKey: ["catalogue", id] });
      qc.invalidateQueries({ queryKey: ["cataloguesWithStatusCounts", user?.id] });
      qc.invalidateQueries({ queryKey: ["publicCatalogue"] });

      if (!isEditing) {
          navigate(`/u/catalogues/edit/${id}`, { replace: true });
      }
    },
    onError: (err: any) => {
        console.error("Save mutation failed:", err);
        toast.error(`Failed to save catalogue: ${err.message}`);
    },
  });

  // --- Render Loading State for initial data fetch ---
  if (isLoadingCatalogue || isLoadingAllArtworks) {
    return (
      <div className="page-container text-center py-10">
        <p className="loading-message">Loading catalogue details...</p>
      </div>
    );
  }

  // --- Live Preview URL ---
  const publicPreviewUrl = useMemo(() => {
    if (!profile?.slug || !catalogueId) return null; // For new catalogues, we don't have a slug yet
    // For live preview, construct URL using ID for draft, or existing slug if published
    const slug = fetchedCatalogueData?.slug || 'preview'; // Use actual slug if available, else a placeholder
    return `${window.location.origin}/u/${profile.slug}/catalogue/${slug}?previewId=${catalogueId}`;
  }, [profile?.slug, catalogueId, fetchedCatalogueData?.slug]);

  // --- Main Render ---
  return (
    <div className="page-container">
      <h1 className="page-title">{isEditing ? "Edit Catalogue" : "Create Catalogue"}</h1>
      <p className="page-subtitle">Manage your catalogue's details, artworks, and audience access.</p>

      <form
        onSubmit={saveMutation.mutate}
        className="form-card"
      >
        {/* Basic Catalogue Details */}
        <div className="form-section">
            <h3 className="section-title">Catalogue Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-group">
                    <label htmlFor="catalogue-title" className="label">Title</label>
                    <input
                      id="catalogue-title"
                      type="text"
                      value={title}
                      onChange={(e) => { setTitle(e.target.value); setErrors(prev => ({ ...prev, title: '' })); }}
                      required
                      className={`input ${errors.title ? 'input-error' : ''}`}
                    />
                    {errors.title && <p className="error-message">{errors.title}</p>}
                </div>

                <div className="form-group">
                    <label htmlFor="cover-artwork-select" className="label">Cover Artwork</label>
                    <select
                      id="cover-artwork-select"
                      value={coverArtworkId || ""}
                      onChange={(e) => setCoverArtworkId(e.target.value || null)}
                      className="input"
                      disabled={isLoadingAllArtworks}
                    >
                      <option value="">-- None --</option>
                      {isLoadingAllArtworks && <option disabled>Loading artworks...</option>}
                      {isErrorAllArtworks && <option disabled className="text-red-500">Error loading artworks: {allArtworksError?.message}</option>}
                      {!isLoadingAllArtworks && !isErrorAllArtworks && allAvailableArtworks?.length === 0 && (
                          <option disabled>No artworks available</option>
                      )}
                      {allAvailableArtworks?.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title}
                        </option>
                      ))}
                    </select>
                </div>
            </div>

            <div className="form-group">
              <label htmlFor="catalogue-description" className="label">Description</label>
              <textarea
                id="catalogue-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="textarea min-h-[120px]"
                placeholder="A brief overview of your catalogue..."
              />
            </div>
        </div>


        {/* Artworks Management Section */}
        {user?.id && (
          <ArtworkManager
            catalogueId={catalogueId}
            userId={user.id}
            initialCatalogueArtworks={fetchedCatalogueData?.linkedArtworks || []}
            allAvailableArtworks={allAvailableArtworks || []}
            isLoading={isLoadingAllArtworks}
            isError={isErrorAllArtworks}
            onArtworksChange={setCatalogueArtworks}
          />
        )}


        {/* Access Type and Password */}
        <div className="form-section">
            <h3 className="section-title">Catalogue Access</h3>
            <p className="form-section-description">Control who can view your catalogue.</p>
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                <label className="radio-label">
                    <input
                        type="radio"
                        name="accessType"
                        value="public"
                        checked={accessType === "public"}
                        onChange={() => setAccessType("public")}
                        className="radio"
                    />
                    <Eye size={16} /> Public
                </label>
                <label className="radio-label">
                    <input
                        type="radio"
                        name="accessType"
                        value="password_protected"
                        checked={accessType === "password_protected"}
                        onChange={() => { setAccessType("password_protected"); setErrors(prev => ({ ...prev, password: '' })); }}
                        className="radio"
                    />
                    <Lock size={16} /> Password Protected
                </label>
                <label className="radio-label">
                    <input
                        type="radio"
                        name="accessType"
                        value="restricted_audience"
                        checked={accessType === "restricted_audience"}
                        onChange={() => { setAccessType("restricted_audience"); setErrors(prev => ({ ...prev, restrictedAudienceIds: '' })); }}
                        className="radio"
                    />
                    <Users size={16} /> Restricted Audience
                </label>
            </div>

            {accessType === "password_protected" && (
                <div className="pl-6 pt-2">
                    <div className="form-group">
                        <label htmlFor="catalogue-password" className="label">Password</label>
                        <input
                            id="catalogue-password"
                            type="password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: '' })); }}
                            required
                            className={`input md:w-1/2 ${errors.password ? 'input-error' : ''}`}
                            placeholder="Enter password"
                        />
                        {errors.password && <p className="error-message">{errors.password}</p>}
                    </div>
                </div>
            )}

            {accessType === "restricted_audience" && user?.id && (
                <div className="pl-6 pt-2">
                    <AudienceSelector
                        userId={user.id}
                        initialAudienceIds={fetchedCatalogueData?.linkedAudienceIds || []}
                        onAudienceChange={(ids) => { setRestrictedAudienceIds(ids); setErrors(prev => ({ ...prev, restrictedAudienceIds: '' })); }}
                    />
                    {errors.restrictedAudienceIds && <p className="error-message mt-2">{errors.restrictedAudienceIds}</p>}
                </div>
            )}
        </div>

        {/* Scheduling Section */}
        <div className="form-section">
            <h3 className="section-title">Schedule Catalogue Send (Optional)</h3>
            <p className="form-section-description">Schedule a future date and time for this catalogue to be sent.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-group">
                    <label htmlFor="scheduled-date" className="label">Send Date</label>
                    <div className="input-with-icon">
                        <input
                            id="scheduled-date"
                            type="date"
                            value={scheduledSendDate}
                            onChange={(e) => setScheduledSendDate(e.target.value)}
                            className="input"
                        />
                        <Calendar size={18} className="text-muted-foreground" />
                    </div>
                </div>
                <div className="form-group">
                    <label htmlFor="scheduled-time" className="label">Send Time</label>
                    <div className="input-with-icon">
                        <input
                            id="scheduled-time"
                            type="time"
                            value={scheduledSendTime}
                            onChange={(e) => setScheduledSendTime(e.target.value)}
                            className="input"
                        />
                        <Clock size={18} className="text-muted-foreground" />
                    </div>
                </div>
                <div className="form-group">
                  <label htmlFor="scheduled-timezone" className="label">Timezone</label>
                  <select
                    id="scheduled-timezone"
                    value={scheduledSendTimezone}
                    onChange={(e) => setScheduledSendTimezone(e.target.value)}
                    className="input"
                  >
                    {/* Simplified list of common timezones, full list would be very long */}
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="America/Los_Angeles">America/Los_Angeles</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Europe/Paris">Europe/Paris</option>
                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                    <option value="Australia/Sydney">Australia/Sydney</option>
                    <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                      {Intl.DateTimeFormat().resolvedOptions().timeZone} (Local)
                    </option>
                  </select>
                </div>
            </div>
            {(scheduledSendDate || scheduledSendTime) && (
                <p className="text-sm text-muted-foreground mt-2">
                    Catalogue will be scheduled for: {scheduledSendDate || '[No Date]'} {scheduledSendTime || '[No Time]'} ({scheduledSendTimezone})
                </p>
            )}
        </div>

        {/* System Catalogue checkbox */}
        <div className="form-section">
            <h3 className="section-title">Advanced Settings</h3>
            {isEditing && fetchedCatalogueData?.is_system_catalogue ? (
                <p className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Lock size={16} /> This is a system catalogue. Its system status cannot be changed.
                </p>
            ) : (
                <div className="checkbox-item">
                    <input
                        type="checkbox"
                        id="is-system-catalogue"
                        checked={isSystem}
                        onChange={(e) => setIsSystem(e.target.checked)}
                        className="checkbox"
                    />
                    <label htmlFor="is-system-catalogue" className="label-inline">Is System Catalogue? <span className="text-muted-foreground">(Typically for internal use only)</span></label>
                </div>
            )}
        </div>

        {/* Submit Button & Live Preview */}
        <div className="form-actions">
          {publicPreviewUrl && (
            <Link to={publicPreviewUrl} target="_blank" rel="noopener noreferrer" className="button button-secondary button-with-icon">
              <Eye size={16} /> View Live Preview
            </Link>
          )}
          <button
            type="submit"
            className="button button-primary button-lg"
            disabled={saveMutation.isLoading || !title.trim()}
          >
            {saveMutation.isLoading
              ? isEditing
                ? "Saving…"
                : "Creating…"
              : isEditing
              ? "Save Changes"
              : "Create Catalogue"}
          </button>
          {saveMutation.isError && <p className="error-message mt-2">Error: {saveMutation.error?.message}</p>}
        </div>
      </form>
    </div>
  );
}