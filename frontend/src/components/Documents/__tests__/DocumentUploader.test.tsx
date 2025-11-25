import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentUploader from '../DocumentUploader';
import { apiClient } from '@/lib/api-client';

// Mock the API client
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    uploadDocument: jest.fn(),
  },
}));

// Mock the UI components
jest.mock('../../UI/GlassPanel', () => {
  return function MockGlassPanel({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div data-testid="glass-panel" className={className}>{children}</div>;
  };
});

jest.mock('../../UI/Button', () => {
  return function MockButton({
    children,
    onClick,
    disabled,
    variant,
    isLoading
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
    isLoading?: boolean;
  }) {
    return (
      <button
        onClick={onClick}
        disabled={disabled || isLoading}
        data-variant={variant}
        data-loading={isLoading}
      >
        {children}
      </button>
    );
  };
});

jest.mock('../UploadProgress', () => {
  return function MockUploadProgress({ progress }: { progress: number }) {
    return <div data-testid="upload-progress">Progress: {progress}%</div>;
  };
});

describe('DocumentUploader', () => {
  const mockOnClose = jest.fn();
  const mockOnUploadComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders upload dropzone', () => {
    render(
      <DocumentUploader onClose={mockOnClose} onUploadComplete={mockOnUploadComplete} />
    );

    expect(screen.getByText('Upload Document')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop your document here')).toBeInTheDocument();
    expect(screen.getByText('Browse Files')).toBeInTheDocument();
  });

  it('validates file type - accepts PDF', async () => {
    render(
      <DocumentUploader onClose={mockOnClose} onUploadComplete={mockOnUploadComplete} />
    );

    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    expect(screen.getByText('test.pdf')).toBeInTheDocument();
    expect(screen.queryByText(/Unsupported file type/)).not.toBeInTheDocument();
  });

  it('validates file type - accepts TXT', async () => {
    render(
      <DocumentUploader onClose={mockOnClose} onUploadComplete={mockOnUploadComplete} />
    );

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    expect(screen.getByText('test.txt')).toBeInTheDocument();
  });

  it('validates file type - accepts MD', async () => {
    render(
      <DocumentUploader onClose={mockOnClose} onUploadComplete={mockOnUploadComplete} />
    );

    const file = new File(['# Test'], 'test.md', { type: 'text/markdown' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    expect(screen.getByText('test.md')).toBeInTheDocument();
  });

  it('validates file type - accepts DOCX', async () => {
    render(
      <DocumentUploader onClose={mockOnClose} onUploadComplete={mockOnUploadComplete} />
    );

    const file = new File(['test'], 'test.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    expect(screen.getByText('test.docx')).toBeInTheDocument();
  });

  it('rejects unsupported file types via drag and drop', async () => {
    render(
      <DocumentUploader onClose={mockOnClose} onUploadComplete={mockOnUploadComplete} />
    );

    // Use drag-and-drop to bypass the input accept attribute
    const dropZone = screen.getByText('Drag and drop your document here').closest('div')!.parentElement!;
    const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(screen.getByText(/Unsupported file type/)).toBeInTheDocument();
  });

  it('rejects files over 10MB', async () => {
    render(
      <DocumentUploader onClose={mockOnClose} onUploadComplete={mockOnUploadComplete} />
    );

    // Create a file > 10MB
    const largeContent = new Array(11 * 1024 * 1024).fill('a').join('');
    const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    expect(screen.getByText(/File is too large/)).toBeInTheDocument();
  });

  it('shows upload progress during upload', async () => {
    (apiClient.uploadDocument as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ document_id: 'test-123', chunks_created: 5 }), 500))
    );

    render(
      <DocumentUploader onClose={mockOnClose} onUploadComplete={mockOnUploadComplete} />
    );

    // Select a file
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    // Click upload
    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);

    // Check progress is shown
    await waitFor(() => {
      expect(screen.getByTestId('upload-progress')).toBeInTheDocument();
    });
  });

  it('handles upload errors gracefully', async () => {
    (apiClient.uploadDocument as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(
      <DocumentUploader onClose={mockOnClose} onUploadComplete={mockOnUploadComplete} />
    );

    // Select a file
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    // Click upload
    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);

    // Check error is shown
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('calls onUploadComplete callback on success', async () => {
    const mockResponse = { document_id: 'test-123', chunks_created: 5 };
    (apiClient.uploadDocument as jest.Mock).mockResolvedValue(mockResponse);

    render(
      <DocumentUploader onClose={mockOnClose} onUploadComplete={mockOnUploadComplete} />
    );

    // Select a file
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    // Click upload
    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);

    // Wait for completion (component has 2s indexing delay before calling callback)
    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalledWith(mockResponse);
    }, { timeout: 5000 });
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <DocumentUploader onClose={mockOnClose} onUploadComplete={mockOnUploadComplete} />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when X button is clicked', () => {
    render(
      <DocumentUploader onClose={mockOnClose} onUploadComplete={mockOnUploadComplete} />
    );

    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays file size correctly', async () => {
    render(
      <DocumentUploader onClose={mockOnClose} onUploadComplete={mockOnUploadComplete} />
    );

    // Create a 1.5 KB file
    const content = new Array(1536).fill('a').join('');
    const file = new File([content], 'test.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    await userEvent.upload(input, file);

    expect(screen.getByText('1.5 KB')).toBeInTheDocument();
  });

  it('allows selecting different file after initial selection', async () => {
    render(
      <DocumentUploader onClose={mockOnClose} onUploadComplete={mockOnUploadComplete} />
    );

    // Select first file
    const file1 = new File(['test'], 'first.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file1);

    expect(screen.getByText('first.pdf')).toBeInTheDocument();

    // Click "Choose Different File"
    const chooseButton = screen.getByText('Choose Different File');
    expect(chooseButton).toBeInTheDocument();
  });

  it('shows success message after upload', async () => {
    const mockResponse = { document_id: 'test-123', chunks_created: 5 };
    (apiClient.uploadDocument as jest.Mock).mockResolvedValue(mockResponse);

    render(
      <DocumentUploader onClose={mockOnClose} onUploadComplete={mockOnUploadComplete} />
    );

    // Select and upload
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    const uploadButton = screen.getByText('Upload');
    fireEvent.click(uploadButton);

    // Check success message
    await waitFor(() => {
      expect(screen.getByText(/Document ID: test-123/)).toBeInTheDocument();
      expect(screen.getByText(/Chunks created: 5/)).toBeInTheDocument();
    });
  });
});
