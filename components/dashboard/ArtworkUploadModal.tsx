import React, { useMemo, useCallback } from 'react';
import { useArtworkUploadStore, UploadFile } from '@/stores/artworkUploadStore';
import { useAuth } from '@/contexts/AuthProvider';
import { X, UploadCloud } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface ArtworkUploadModalProps {
  onUploadComplete: (artworkIds: string[]) => void;
}

const ArtworkUploadModal = ({ onUploadComplete }: ArtworkUploadModalProps) => {
  const { files, isUploading, uploadAndCreatePendingArtworks, cancelUpload, clearStore, addFiles } = useArtworkUploadStore();
  const { user } = useAuth();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    addFiles(acceptedFiles);
  }, [addFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.gif', '.jpg', '.webp'] }
  });

  const handleCreate = async () => {
    if (!user) return;
    const createdArtworkIds = await uploadAndCreatePendingArtworks(user.id);
    onUploadComplete(createdArtworkIds);
  };

  const isCreateDisabled = useMemo(() => {
    if (isUploading) return true;
    if (files.length === 0) return true;
    if (files.some(f => f.status !== 'success')) return true;
    return false;
  }, [files, isUploading]);

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <button onClick={clearStore} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
        <h3>Upload Artworks</h3>
        
        {/* FIXED: Moved file list above the dropzone */}
        <div style={{ maxHeight: '200px', overflowY: 'auto', margin: '1rem 0' }}>
          {files.map((file: UploadFile) => (
            <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flexGrow: 1 }}>
                <p style={{ wordBreak: 'break-all', fontSize: '0.875rem' }}>{file.file.name}</p>
                <div style={{ width: '100%', background: 'var(--input)', borderRadius: 'var(--radius)', overflow: 'hidden', height: '8px', marginTop: '0.5rem' }}>
                  <div style={{ 
                    width: `${file.progress}%`, 
                    background: file.status === 'error' ? 'red' : 'var(--primary)', 
                    height: '8px',
                    transition: 'width 0.4s ease'
                  }}></div>
                </div>
                {file.status === 'error' && <p style={{ color: 'red', fontSize: '0.75rem', marginTop: '0.25rem' }}>Error: {file.error}</p>}
                {file.status === 'success' && <p style={{ color: 'green', fontSize: '0.75rem', marginTop: '0.25rem' }}>Ready to create</p>}
              </div>
              <button onClick={() => cancelUpload(file.id)} className="button-secondary" disabled={isUploading}><X size={16} /></button>
            </div>
          ))}
        </div>
        
        {/* FIXED: Dropzone is now below the file list */}
        <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? 'var(--primary)' : 'var(--border)'}`, padding: '2rem', textAlign: 'center', borderRadius: 'var(--radius)', cursor: 'pointer', margin: '1rem 0' }}>
          <input {...getInputProps()} />
          <UploadCloud style={{ margin: '0 auto 1rem auto', color: 'var(--muted-foreground)' }} />
          {isDragActive ? <p>Drop files here</p> : <p>Drag 'n' drop, or click to select more files</p>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <button className="button-secondary" onClick={clearStore} disabled={isUploading}>Cancel All</button>
          <button className="button button-primary" onClick={handleCreate} disabled={isCreateDisabled}>
            {isUploading ? 'Processing...' : `Create ${files.length} Pending Artwork(s)`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtworkUploadModal;