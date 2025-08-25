// src/components/ui/ImageUpload.tsx

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X } from 'lucide-react';

interface ImageUploadProps {
  onFileSelect: (file: File | null) => void;
  initialPreview?: string; // <-- ADDED THIS PROP
}

const ImageUpload = ({ onFileSelect, initialPreview }: ImageUploadProps) => {
  const [preview, setPreview] = useState<string | null>(initialPreview || null);

  // -- ADDED useEffect to update preview if the initial prop changes --
  useEffect(() => {
    setPreview(initialPreview || null);
  }, [initialPreview]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      onFileSelect(file);
      setPreview(URL.createObjectURL(file));
    }
  }, [onFileSelect]);

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the dropzone from opening
    setPreview(null);
    onFileSelect(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.gif'] },
    multiple: false,
  });

  return (
    <div {...getRootProps()} className={`image-upload-dropzone ${isDragActive ? 'drag-active' : ''}`}>
      <input {...getInputProps()} />
      {preview ? (
        <>
          <img src={preview} alt="Profile preview" className="image-upload-preview" />
          <button onClick={removeImage} className="image-upload-remove-button">
            <X size={16} />
          </button>
        </>
      ) : (
        <div className="image-upload-placeholder">
          <UploadCloud size={32} />
          <span>Upload Image</span>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;