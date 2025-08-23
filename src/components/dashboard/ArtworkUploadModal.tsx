// src/components/dashboard/ArtworkUploadModal.tsx

import React, { useCallback } from 'react';
import { useArtworkUploadStore, UploadFile } from '../../stores/artworkUploadStore';
import { useAuth } from '../../contexts/AuthProvider';
import { X, UploadCloud, FileImage, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface ArtworkUploadModalProps {
  onUploadComplete: (artworkIds: string[]) => void;
}

// A simple progress bar component for individual files
const FileProgressBar = ({ progress }: { progress: number }) => (
    <div style={{ width: '100%', background: 'var(--input)', borderRadius: 'var(--radius)', overflow: 'hidden', height: '4px', marginTop: '4px' }}>
        <div style={{ width: `${progress}%`, background: 'var(--primary)', height: '4px', transition: 'width 0.2s ease' }}></div>
    </div>
);


const ArtworkUploadModal = ({ onUploadComplete }: ArtworkUploadModalProps) => {
  // NOTE: Assumes the store now provides detailed file status, progress, and errors per file.
  // And `removeFile` replaces `cancelUpload` for removing an item from the queue.
  const { files, isUploading, totalProgress, uploadAndCreatePendingArtworks, removeFile, clearStore, addFiles } = useArtworkUploadStore();
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
  
  const isCreateDisabled = isUploading || files.length === 0;
  
  const renderFileStatus = (file: UploadFile) => {
    // This rendering is based on the assumption that the store now provides these statuses on the file object
    switch (file.status) {
        case 'uploading':
            return <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{Math.round(file.progress)}%</p>;
        case 'success':
            return <CheckCircle2 size={20} style={{ color: 'green' }} />;
        case 'error':
            return <AlertCircle size={20} style={{ color: 'red' }} />;
        default:
            return <FileImage size={20} style={{ color: 'var(--muted-foreground)' }} />;
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <button onClick={clearStore} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
        <h3>Upload New Artworks</h3>

        <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? 'var(--primary)' : 'var(--border)'}`, padding: '2rem', textAlign: 'center', borderRadius: 'var(--radius)', cursor: 'pointer', margin: '1rem 0' }}>
          <input {...getInputProps()} />
          <UploadCloud style={{ margin: '0 auto 1rem auto', color: 'var(--muted-foreground)' }} />
          {isDragActive ? <p>Drop files here</p> : <p>Drag 'n' drop, or click to select files</p>}
        </div>
        
        <div style={{ maxHeight: '200px', overflowY: 'auto', margin: '1rem 0' }}>
          {files.map((file: UploadFile) => (
            <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', background: 'var(--input)', padding: '0.75rem 1rem', borderRadius: 'var(--radius)' }}>
              <div style={{ flexShrink: 0 }}>{renderFileStatus(file)}</div>
              <div style={{ flexGrow: 1, wordBreak: 'break-all' }}>
                  <p style={{ fontSize: '0.875rem', lineHeight: '1.2' }}>{file.file.name}</p>
                  {file.status === 'uploading' && <FileProgressBar progress={file.progress} />}
                  {file.status === 'error' && <p style={{ color: 'red', fontSize: '0.75rem', marginTop: '4px' }}>{file.error || 'Upload failed'}</p>}
              </div>
              <button onClick={() => removeFile(file.id)} className="button-secondary" disabled={isUploading}><X size={16} /></button>
            </div>
          ))}
        </div>

        {isUploading && (
            <div style={{ margin: '1rem 0' }}>
                <p style={{textAlign: 'center', marginBottom: '0.5rem'}}>Overall Progress... {Math.round(totalProgress)}%</p>
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
            {isUploading ? 'Processing...' : `Create ${files.length} Artwork${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtworkUploadModal;
