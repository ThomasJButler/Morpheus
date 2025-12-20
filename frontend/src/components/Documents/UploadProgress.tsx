interface UploadProgressProps {
  progress: number;
}

export default function UploadProgress({ progress }: UploadProgressProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-matrix-white/80 font-mono">Uploading...</span>
        <span className="text-matrix-green font-mono">{progress}%</span>
      </div>
      <div className="h-2 bg-glass-bg rounded-full overflow-hidden">
        <div
          className="h-full bg-matrix-green transition-all duration-250 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-matrix-white/60 text-center">
        Processing document and creating embeddings...
      </p>
    </div>
  );
}