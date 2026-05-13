'use client';

import { useState, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { DocumentUploadResponse } from '@/lib/types';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import UploadProgress from './UploadProgress';

interface DocumentUploaderProps {
  isOpen: boolean;
  onUploadComplete?: (response: DocumentUploadResponse) => void;
  onClose: () => void;
}

// Supported file types and validation (moved outside component)
const SUPPORTED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const SUPPORTED_EXTENSIONS = ['.pdf', '.txt', '.md', '.docx'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const validateFile = (file: File): string | null => {
  if (!SUPPORTED_TYPES.includes(file.type) &&
      !SUPPORTED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))) {
    return 'Unsupported file type. Please upload PDF, TXT, MD, or DOCX files.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File is too large. Maximum size is 10MB.';
  }
  return null;
};

export default function DocumentUploader({
  isOpen,
  onUploadComplete,
  onClose,
}: DocumentUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<DocumentUploadResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }
    setError(null);
    setSuccess(null);
    setSelectedFile(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await apiClient.uploadDocument(selectedFile);

      clearInterval(progressInterval);
      setUploadProgress(100);
      setSuccess(response);

      // Show indexing state while Pinecone propagates vectors
      setIsIndexing(true);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay for Pinecone propagation
      setIsIndexing(false);

      // Broadcast so v2 consumers (DocsSidebar, future System panel Sources
      // tab) refetch without lifting state. Listeners use addEventListener
      // on the 'morpheus:documents-changed' event name.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('morpheus:documents-changed'));
      }

      if (onUploadComplete) {
        onUploadComplete(response);
      }

      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload document"
      size="lg"
      icon={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      }
      footer={
        <>
          <Button onClick={onClose} variant="ghost" disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            variant="primary"
            disabled={!selectedFile || isUploading || !!success}
            isLoading={isUploading}
          >
            {success ? 'Uploaded' : 'Upload'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
            isDragging
              ? 'border-matrix-green bg-matrix-green/10'
              : 'border-glass-border bg-glass-bg/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_EXTENSIONS.join(',')}
            onChange={handleFileInput}
            className="hidden"
          />

          {!selectedFile ? (
            <div className="space-y-4">
              <div className="text-5xl">📄</div>
              <div>
                <p className="text-matrix-white mb-2">
                  Drag and drop your document here
                </p>
                <p className="text-sm text-matrix-white/60 mb-4">
                  or
                </p>
                <Button onClick={handleBrowseClick} variant="primary">
                  Browse Files
                </Button>
              </div>
              <p className="text-xs text-matrix-white/40">
                Supported: PDF, TXT, MD, DOCX (max 10MB)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-4xl">✓</div>
              <div>
                <p className="text-matrix-green font-mono mb-1">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-matrix-white/60">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              {!isUploading && !success && (
                <Button
                  onClick={handleBrowseClick}
                  variant="ghost"
                  size="sm"
                >
                  Choose Different File
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="mt-6">
            <UploadProgress progress={uploadProgress} />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mt-4 p-4 bg-matrix-green/10 border border-matrix-green/50 rounded-md">
            <div className="flex items-center space-x-2 text-matrix-green mb-2">
              <span className="text-xl">{isIndexing ? '⏳' : '✓'}</span>
              <span className="font-mono">
                {isIndexing ? 'Indexing document...' : 'Upload Successful!'}
              </span>
            </div>
            <div className="text-sm text-matrix-white/80 space-y-1">
              <p>Document ID: {success.document_id}</p>
              <p>Chunks created: {success.chunks_created}</p>
              {isIndexing ? (
                <p className="text-matrix-cyan animate-pulse">Making document searchable...</p>
              ) : (
                <p className="text-matrix-green">Ready to use in chat!</p>
              )}
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}