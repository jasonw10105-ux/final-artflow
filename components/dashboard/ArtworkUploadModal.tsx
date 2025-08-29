import React, { useCallback, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { useArtworkUploadStore, UploadFile } from "@/stores/artworkUploadStore";
import { X, UploadCloud } from "lucide-react";

interface ArtworkUploadModalProps {
  onUploadComplete: (uploadedIds: string[]) => void;
  allowAdditional?: boolean;
}

const ArtworkUploadModal = ({ onUploadComplete, allowAdditional = true }: ArtworkUploadModalProps) => {
  const { files, addFiles, cancelUpload, clearStore, uploadAndCreatePendingArtworks, isUploading } =
    useArtworkUploadStore();

  const onDrop = useCallback(
    (acceptedFiles: File[], isPrimary = false) => {
      const limit = isPrimary ? 1 : 4;
      const existingCount = files.filter((f) => f.isPrimary === isPrimary).length;
      const remainingSlots = limit - existingCount;
      if (remainingSlots <= 0) return;
      addFiles(acceptedFiles.slice(0, remainingSlots), isPrimary);
    },
    [addFiles, files]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => onDrop(acceptedFiles, true),
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  const handleCreate = async () => {
    const primaryFile = files.find((f) => f.isPrimary);
    if (!primaryFile) return;

    const uploadedIds = await uploadAndCreatePendingArtworks("user-id-placeholder"); // replace with real user id
    onUploadComplete(uploadedIds);
    clearStore();
  };

  const isCreateDisabled = useMemo(() => {
    const primaryFile = files.find((f) => f.isPrimary);
    if (!primaryFile) return true;
    if (primaryFile.status !== "success") return true;
    return false;
  }, [files]);

  const additionalFiles = allowAdditional ? files.filter((f) => !f.isPrimary) : [];

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <button onClick={clearStore} style={{ position: "absolute", top: 12, right: 12, border: "none", background: "none" }}>
          <X />
        </button>
        <h3>Upload Artwork</h3>

        {/* Primary Image */}
        <p>Primary Image (required)</p>
        <div {...getRootProps()} className={`dropzone ${isDragActive ? "active" : ""}`}>
          <input {...getInputProps()} />
          <UploadCloud size={48} />
          <p>{isDragActive ? "Drop here…" : "Drag & drop, or click to select"}</p>
        </div>

        <div style={{ maxHeight: 200, overflowY: "auto", marginTop: 12 }}>
          {files.map((file: UploadFile) => (
            <div key={file.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <p>{file.file.name}</p>
                <div style={{ width: "100%", height: 6, background: "#eee", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${file.progress}%`,
                      height: "6px",
                      background: file.status === "error" ? "red" : "#4f46e5",
                      transition: "width 0.4s",
                    }}
                  />
                </div>
                {file.status === "error" && <p style={{ color: "red" }}>{file.error}</p>}
              </div>
              <button onClick={() => cancelUpload(file.id)} disabled={isUploading}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Additional Images */}
        {allowAdditional && (
          <div style={{ marginTop: 16 }}>
            <p>Additional Images (optional, max 4)</p>
            <AdditionalImagesDropzone files={additionalFiles} onDrop={onDrop} isUploading={isUploading} cancelUpload={cancelUpload} />
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={clearStore} className="button-secondary" disabled={isUploading}>
            Cancel All
          </button>
          <button onClick={handleCreate} className="button-primary" disabled={isCreateDisabled}>
            {isUploading ? "Uploading…" : "Save & Continue"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtworkUploadModal;

const AdditionalImagesDropzone = ({
  files,
  onDrop,
  isUploading,
  cancelUpload,
}: {
  files: UploadFile[];
  onDrop: (files: File[], isPrimary?: boolean) => void;
  isUploading: boolean;
  cancelUpload: (id: string) => void;
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => onDrop(acceptedFiles, false),
    accept: { "image/*": [] },
    maxFiles: 4,
  });

  return (
    <>
      <div {...getRootProps()} className={`dropzone ${isDragActive ? "active" : ""}`}>
        <input {...getInputProps()} />
        <UploadCloud size={36} />
        <p>{isDragActive ? "Drop here…" : "Drag & drop additional images or click"}</p>
      </div>

      <div style={{ maxHeight: 150, overflowY: "auto", marginTop: 8 }}>
        {files.map((file) => (
          <div key={file.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{file.file.name}</span>
            <button onClick={() => cancelUpload(file.id)} disabled={isUploading}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
};
