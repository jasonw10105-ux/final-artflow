// src/components/ui/ImageUpload.tsx

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Camera, X } from 'lucide-react';

interface ImageUploadProps {
  onFileSelect: (file: File | null) => void;
  initialImageUrl?: string | null;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onFileSelect, initialImageUrl }) => {
  const [preview, setPreview] = useState<string | null>(initialImageUrl || null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setPreview(URL.createObjectURL(file));
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.gif', '.webp'] },
    multiple: false,
  });

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onFileSelect(null);
  };

  const dropzoneClassName = `image-upload-dropzone ${isDragActive ? 'drag-active' : ''}`;

  return (
    <div {...getRootProps()} className={dropzoneClassName}>
      <input {...getInputProps()} />
      {preview ? (
        <>
          <img src={preview} alt="Profile preview" className="image-upload-preview" />
          <button type="button" onClick={handleRemoveImage} className="image-upload-remove-button">
            <X size={16} />
          </button>
        </>
      ) : (
        <div className="image-upload-placeholder">
          <Camera size={24} />
          <span>Upload Image</span>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;