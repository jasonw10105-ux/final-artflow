import React, { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useArtworkUploadStore, UploadFile } from "@/stores/artworkUploadStore";
import { useAuth } from "@/contexts/AuthProvider";
import { X, UploadCloud } from "lucide-react";

interface ArtworkUploadModalProps {
  onUploadComplete: (uploadedIds: string[]) => void;
  primaryOnly?: boolean;
  maxFiles?: number;
}

const ArtworkUploadModal = ({ onUploadComplete, primaryOnly = false, maxFiles = 4 }: ArtworkUploadModalProps) => {
  const { files, isUploading, uploadAndCreatePendingArtworks, cancelUpload, clearStore, addFiles } =
    useArtworkUploadStore();
  const { user } = useAuth();

  const [saving, setSaving] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (primaryOnly && acceptedFiles.length > 1) acceptedFiles = [acceptedFiles[0]];
      if (!primaryOnly && files.length + acceptedFiles.length > maxFiles) {
        acceptedFiles = acceptedFiles.slice(0, maxFiles - files.length);
      }
      addFiles(acceptedFiles);
    },
    [addFiles, files.length, primaryOnly, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".png", ".gif", ".jpg", ".webp"] },
  });

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const uploadedIds = await uploadAndCreatePendingArtworks(user.id);
      onUploadComplete(uploadedIds);
      clearStore();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const isSaveDisabled = useMemo(() => {
    if (saving || isUploading) return true;
    if (files.length === 0) return true;
    if (files.some((f) => f.status !== "success")) return true;
    return false;
  }, [files, saving, isUploading]);

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <button
          onClick={clearStore}
          style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", cursor: "pointer" }}
        >
          <X />
        </button>

        <h3>{primaryOnly ? "Upload Primary Image" : "Upload Additional Images"}</h3>

        <div style={{ maxHeight: "200px", overflowY: "auto", margin: "1rem 0" }}>
          {files.map((file: UploadFile) => (
            <div key={file.id} style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
              <div style={{ flexGrow: 1 }}>
                <p style={{ wordBreak: "break-all", fontSize: "0.875rem" }}>{file.file.name}</p>
                <div style={{ width: "100%", background: "var(--input)", borderRadius: "var(--radius)", overflow: "hidden", height: "8px", marginTop: "0.5rem" }}>
                  <div style={{ width: `${file.progress}%`, background: file.status === "error" ? "red" : "var(--primary)", height: "8px", transition: "width 0.4s ease" }} />
                </div>
                {file.status === "error" && <p style={{ color: "red", fontSize: "0.75rem", marginTop: "0.25rem" }}>Error: {file.error}</p>}
                {file.status === "success" && <p style={{ color: "green", fontSize: "0.75rem", marginTop: "0.25rem" }}>Ready to save</p>}
              </div>
              <button onClick={() => cancelUpload(file.id)} className="button-secondary" disabled={isUploading}><X size={16} /></button>
            </div>
          ))}
        </div>

        <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? "var(--primary)" : "var(--border)"}`, padding: "2rem", textAlign: "center", borderRadius: "var(--radius)", cursor: "pointer", margin: "1rem 0" }}>
          <input {...getInputProps()} />
          <UploadCloud style={{ margin: "0 auto 1rem auto", color: "var(--muted-foreground)" }} />
          {isDragActive ? <p>Drop files here</p> : <p>Drag & drop, or click to select files</p>}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
          <button className="button-secondary" onClick={clearStore} disabled={isUploading || saving}>Cancel All</button>
          <button className="button button-primary" onClick={handleSave} disabled={isSaveDisabled}>
            {saving ? "Saving…" : primaryOnly ? "Save Primary Image" : "Save Additional Images"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtworkUploadModal;
