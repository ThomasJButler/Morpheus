'use client';

import { useState } from 'react';
import DocumentUploader from './DocumentUploader';
import { DocumentUploadResponse } from '@/lib/types';

interface UploadButtonProps {
  onUploadComplete?: (response: DocumentUploadResponse) => void;
}

export default function UploadButton({ onUploadComplete }: UploadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleUploadComplete = (response: DocumentUploadResponse) => {
    if (onUploadComplete) {
      onUploadComplete(response);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-matrix-green hover:text-matrix-cyan transition-colors text-sm font-mono flex items-center space-x-2 group"
        title="Upload documents"
      >
        <span className="text-lg group-hover:scale-110 transition-transform">
          📄
        </span>
        <span>Upload</span>
      </button>

      {isOpen && (
        <DocumentUploader
          onUploadComplete={handleUploadComplete}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}