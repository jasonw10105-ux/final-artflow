import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "@/contexts/AuthProvider";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import { useDropzone } from "react-dropzone";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";

// ------ Types ------

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

// ------ Helpers ------

const coerceDimValue = (v: string): number | string | null => {
  const trimmed = v.trim();
  if (!trimmed) return null;
  if (/^var(iable)?$/i.test(trimmed)) return "variable";
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : "variable";
};

// ------ Sortable Image Item ------

function SortableImageItem({
  item,
  onRemove,
}: {
  item: ArtworkImage;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style} className="img-item">
      <div className="thumb" {...attributes} {...listeners} title="Drag to reorder">
        <img src={item.image_url} alt="" />
      </div>
      <div className="thumb-actions">
        <button
          type="button"
          className="remove-btn"
          onClick={() => onRemove(item.id)}
          aria-label="Remove image"
        >
          <X size={16} />
        </button>
        {item.watermarked_image_url && <span className="badge">WM ✓</span>}
        {item.visualization_image_url && <span className="badge">Viz ✓</span>}
      </div>
      <style jsx>{`
        .img-item {
          display: grid;
          grid-template-columns: 96px 1fr;
          gap: 0.75rem;
          align-items: center;
          padding: 0.5rem;
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 12px;
          background: #fff;
        }
        .thumb {
          width: 96px;
          height: 96px;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
          cursor: grab;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fafafa;
        }
        .thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .thumb-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .remove-btn {
          appearance: none;
          border: none;
          background: #fee2e2;
          color: #991b1b;
          padding: 0.35rem 0.5rem;
          border-radius: 8px;
          cursor: pointer;
        }
        .badge {
          background: #ecfeff;
          color: #0e7490;
          font-size: 12px;
          padding: 0.1rem 0.4rem;
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
}

// ------ Main Component ------

export default function ArtworkEditorForm({
  artworkId,
  onSaved,
}: {
  artworkId?: string;
  onSaved?: (id: string) => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Form state
  const [title, setTitle] = useState("");
  const [mediumParent, setMediumParent] = useState("");
  const [mediumChild, setMediumChild] = useState("");
  const medium = useMemo(() => {
    if (!mediumParent) return "";
    return mediumChild ? `${mediumParent} · ${mediumChild}` : mediumParent;
  }, [mediumParent, mediumChild]);

  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [currency, setCurrency] = useState("ZAR");
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [depth, setDepth] = useState<string>("");

  const [images, setImages] = useState<ArtworkImage[]>([]);
  const [toDelete, setToDelete] = useState<Set<string>>(new Set());

  const [genre, setGenre] = useState("");
  const [keywords, setKeywords] = useState<string>("");

  // Load existing artwork
  useEffect(() => {
    if (!artworkId) return;
    (async () => {
      const { data, error } = await supabase.from("artworks").select("*").eq("id", artworkId).single();
      if (error) {
        toast.error(`Failed to load artwork: ${error.message}`);
        return;
      }
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.medium) {
        const [p, c] = String(data.medium).split("·").map((s) => s.trim());
        setMediumParent(p ?? "");
        setMediumChild(c ?? "");
      }
      if (data.currency) setCurrency(data.currency);
      if (data.is_price_negotiable) setIsNegotiable(true);
      if (data.price != null) setPrice(String(data.price));
      if (data.min_price != null) setMinPrice(String(data.min_price));
      if (data.max_price != null) setMaxPrice(String(data.max_price));
      if (data.genre) setGenre(data.genre);
      if (data.keywords) setKeywords(data.keywords.join(", "));

      const dims = data.dimensions ?? null;
      if (dims) {
        setWidth(dims.width != null ? String(dims.width) : "");
        setHeight(dims.height != null ? String(dims.height) : "");
        setDepth(dims.depth != null ? String(dims.depth) : "");
      }

      const { data: imgs, error: imgErr } = await supabase
        .from("artwork_images")
        .select("*")
        .eq("artwork_id", data.id)
        .order("position", { ascending: true });
      if (imgErr) {
        toast.error(`Failed to load images: ${imgErr.message}`);
      } else {
        setImages((imgs ?? []) as ArtworkImage[]);
      }
    })();
  }, [artworkId]);

  // Dropzone
  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (!user) {
        toast.error("You must be signed in to upload images.");
        return;
      }
      if (!accepted.length) return;

      const newItems: ArtworkImage[] = [];
      const parentId = artworkId ?? `draft-${uuidv4()}`;

      for (const file of accepted) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const id = uuidv4();
        const storagePath = `originals/${user.id}/${parentId}/${id}.${ext}`;

        const arrayBuffer = await file.arrayBuffer();
        const { error: upErr } = await supabase.storage
          .from("artworks")
          .upload(storagePath, arrayBuffer, {
            contentType: file.type || "image/jpeg",
            upsert: true,
          });

        if (upErr) {
          toast.error(`Upload failed: ${upErr.message}`);
          continue;
        }

        const { data: pub } = supabase.storage.from("artworks").getPublicUrl(storagePath);

        newItems.push({
          id,
          artwork_id: artworkId ?? "",
          image_url: pub.publicUrl,
          watermarked_image_url: null,
          visualization_image_url: null,
          position: images.length + newItems.length,
        });
      }

      setImages((prev) => [...prev, ...newItems]);
      toast.success(`${newItems.length} image(s) added`);
    },
    [artworkId, images.length, user]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    multiple: true,
    onDrop,
  });

  // Drag & drop reorder
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex((i) => i.id === active.id);
    const newIndex = images.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(images, oldIndex, newIndex).map((img, idx) => ({
      ...img,
      position: idx,
    }));
    setImages(reordered);
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((i) => i.id !== id));
    if (!id.includes("-")) setToDelete((s) => new Set([...s, id]));
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const payload: Partial<Artwork> = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        medium: medium || null,
        price: price ? Number(price) : null,
        currency,
        is_price_negotiable: isNegotiable,
        min_price: isNegotiable && minPrice ? Number(minPrice) : null,
        max_price: isNegotiable && maxPrice ? Number(maxPrice) : null,
        dimensions: {
          width: coerceDimValue(width),
          height: coerceDimValue(height),
          depth: depth ? coerceDimValue(depth) : null,
          unit: "cm",
        },
        status: "Pending",
        genre: genre.trim() || null,
        keywords: keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      };

      let id = artworkId;
      if (id) {
        const { error: upErr } = await supabase.from("artworks").update(payload).eq("id", id);
        if (upErr) throw new Error(`Update failed: ${upErr.message}`);
      } else {
        const { data, error: insErr } = await supabase.from("artworks").insert(payload).select("id").single();
        if (insErr) throw new Error(`Create failed: ${insErr.message}`);
        id = data.id;
      }

      const existing = await supabase.from("artwork_images").select("id").eq("artwork_id", id!);
      const existingIds = new Set((existing.data ?? []).map((r) => r.id));

      for (const delId of toDelete) {
        if (existingIds.has(delId)) {
          await supabase.from("artwork_images").delete().eq("id", delId);
        }
      }

      for (const img of images) {
        if (existingIds.has(img.id)) {
          await supabase.from("artwork_images").update({ position: img.position }).eq("id", img.id);
        } else {
          const row = {
            id: img.id,
            artwork_id: id!,
            image_url: img.image_url,
            position: img.position,
          };
          await supabase.from("artwork_images").insert(row);
        }
      }

      await fetch(`${supabase.functionsUrl}/process-artwork-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artworkId: id, force: false }),
      });

      return id!;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["artwork", id] });
      qc.invalidateQueries({ queryKey: ["artwork_images", id] });
      toast.success("Artwork saved");
      onSaved?.(id);
    },
    onError: (e: any) => {
      toast.error(e.message ?? "Failed to save");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate();
      }}
      className="form-wrap"
    >
      <h2>Artwork Editor</h2>
      <div className="grid">
        <label className="field">
          <span>Title *</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          <span>Parent Medium *</span>
          <input value={mediumParent} onChange={(e) => setMediumParent(e.target.value)} />
        </label>
        <label className="field">
          <span>Medium (child / technique)</span>
          <input value={mediumChild} onChange={(e) => setMediumChild(e.target.value)} />
        </label>
        <label className="field col-span-2">
          <span>Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </label>
        <label className="field">
          <span>Genre</span>
          <input value={genre} onChange={(e) => setGenre(e.target.value)} />
        </label>
        <label className="field">
          <span>Keywords (comma separated)</span>
          <input value={keywords} onChange={(e) => setKeywords(e.target.value)} />
        </label>
        <div className="field">
          <span>Price *</span>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="field">
          <span>Currency</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="ZAR">ZAR</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <label className="check field">
          <input type="checkbox" checked={isNegotiable} onChange={(e) => setIsNegotiable(e.target.checked)} />
          <span>Price is negotiable</span>
        </label>
        {isNegotiable && (
          <>
            <div className="field">
              <span>Min Price *</span>
              <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
            </div>
            <div className="field">
              <span>Max Price *</span>
              <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
            </div>
          </>
        )}
        <div className="dim col-span-2">
          <label className="field">
            <span>Width *</span>
            <input value={width} onChange={(e) => setWidth(e.target.value)} />
          </label>
          <label className="field">
            <span>Height *</span>
            <input value={height} onChange={(e) => setHeight(e.target.value)} />
          </label>
          <label className="field">
            <span>Depth</span>
            <input value={depth} onChange={(e) => setDepth(e.target.value)} />
          </label>
        </div>
        <div className="col-span-2">
          <div {...getRootProps({ className: "dropzone" })}>
            <input {...getInputProps()} />
            {isDragActive ? <p>Drop images here…</p> : <p>Drag & drop or click to select</p>}
          </div>
          {images.length > 0 && (
            <div className="images-list">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={images.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="list">
                    {images.map((img) => (
                      <SortableImageItem key={img.id} item={img} onRemove={removeImage} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </div>
            <div className="actions">
        <button type="submit" disabled={saveMutation.isLoading}>
          {saveMutation.isLoading ? "Saving..." : "Save Artwork"}
        </button>
      </div>

      <style jsx>{`
        .form-wrap {
          display: grid;
          gap: 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem 1.5rem;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .field input,
        .field textarea,
        .field select {
          border: 1px solid var(--border, #e5e7eb);
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          font-size: 14px;
        }
        .check {
          flex-direction: row;
          align-items: center;
          gap: 0.5rem;
        }
        .dim {
          display: flex;
          gap: 1rem;
        }
        .dropzone {
          border: 2px dashed #94a3b8;
          padding: 1rem;
          text-align: center;
          border-radius: 12px;
          color: #475569;
          cursor: pointer;
          background: #f8fafc;
        }
        .images-list {
          margin-top: 1rem;
        }
        .list {
          display: grid;
          gap: 0.75rem;
        }
        .actions {
          display: flex;
          justify-content: flex-end;
        }
        .actions button {
          padding: 0.6rem 1.2rem;
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        .actions button[disabled] {
          background: #94a3b8;
          cursor: not-allowed;
        }
      `}</style>
    </form>
  );
}

