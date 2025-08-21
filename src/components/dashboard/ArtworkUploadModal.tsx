// src/components/dashboard/ArtworkUploadModal.tsx

import React, { useCallback } from 'react';
import { useArtworkUploadStore, UploadFile } from '../../stores/artworkUploadStore';
import { useAuth } from '../../contexts/AuthProvider';
import { X, UploadCloud, FileImage } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface ArtworkUploadModalProps {
  onUploadComplete: (artworkIds: string[]) => void;
}

const ArtworkUploadModal = ({ onUploadComplete }: ArtworkUploadModalProps) => {
  const { files, isUploading, totalProgress, uploadAndCreatePendingArtworks, cancelUpload, clearStore, addFiles } = useArtworkUploadStore();
  const { user } = useAuth();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    addFiles(acceptedFiles);
  }, [addFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.gif', '.jpg', '.webp'] }
  });

  const handleCreate = async () => {
    if (!user || files.length === 0) return;
    const createdArtworkIds = await uploadAndCreatePendingArtworks(user.id);
    // Only proceed if there are successfully created artworks
    if (createdArtworkIds && createdArtworkIds.length > 0) {
        onUploadComplete(createdArtworkIds);
    }
  };
  
  // The button is disabled if uploading is in progress or if there are no files.
  const isCreateDisabled = isUploading || files.length === 0;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <button onClick={clearStore} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
        <h3>Upload Artworks</h3>

        <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? 'var(--primary)' : 'var(--border)'}`, padding: '2rem', textAlign: 'center', borderRadius: 'var(--radius)', cursor: 'pointer', margin: '1rem 0' }}>
          <input {...getInputProps()} />
          <UploadCloud style={{ margin: '0 auto 1rem auto', color: 'var(--muted-foreground)' }} />
          {isDragActive ? <p>Drop files here</p> : <p>Drag 'n' drop, or click to select files</p>}
        </div>
        
        <div style={{ maxHeight: '200px', overflowY: 'auto', margin: '1rem 0' }}>
          {files.map((file: UploadFile) => (
            <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', background: 'var(--input)', padding: '0.5rem 1rem', borderRadius: 'var(--radius)' }}>
              <FileImage size={20} style={{ color: 'var(--muted-foreground)' }} />
              <p style={{ flexGrow: 1, wordBreak: 'break-all', fontSize: '0.875rem' }}>{file.file.name}</p>
              <button onClick={() => cancelUpload(file.id)} className="button-secondary" disabled={isUploading}><X size={16} /></button>
            </div>
          ))}
        </div>

        {isUploading && (
            <div style={{ margin: '1rem 0' }}>
                <p style={{textAlign: 'center', marginBottom: '0.5rem'}}>Processing... {Math.round(totalProgress)}%</p>
                <div style={{ width: '100%', background: 'var(--input)', borderRadius: 'var(--radius)', overflow: 'hidden', height: '8px' }}>
                    <div style={{ 
                        width: `${totalProgress}%`, 
                        background: 'var(--primary)', 
                        height: '8px',
                        transition: 'width 0.4s ease'
                    }}></div>
                </div>
            </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
          <button className="button-secondary" onClick={clearStore} disabled={isUploading}>Cancel All</button>
          <button className="button button-primary" onClick={handleCreate} disabled={isCreateDisabled}>
            {isUploading ? 'Processing...' : `Create ${files.length} Pending Artworks`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtworkUploadModal;