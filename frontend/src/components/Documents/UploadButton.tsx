'use client';

import { useEffect, useState } from 'react';
import DocumentUploader from './DocumentUploader';
import { DocumentUploadResponse } from '@/lib/types';

interface UploadButtonProps {
  onUploadComplete?: (response: DocumentUploadResponse) => void;
}

export default function UploadButton({ onUploadComplete }: UploadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Allow the header upload icon (desktop) to open the same uploader modal.
  useEffect(() => {
    const onOpen = () => setIsOpen(true);
    window.addEventListener('morpheus:open-upload', onOpen);
    return () => window.removeEventListener('morpheus:open-upload', onOpen);
  }, []);

  const handleUploadComplete = (response: DocumentUploadResponse) => {
    if (onUploadComplete) {
      onUploadComplete(response);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="toolbar-button"
        title="Upload documents"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <span>Upload</span>
      </button>

      <DocumentUploader
        isOpen={isOpen}
        onUploadComplete={handleUploadComplete}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}