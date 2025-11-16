interface LoadingPulseProps {
  text?: string;
}

export default function LoadingPulse({ text = 'Processing' }: LoadingPulseProps) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-matrix-green-dim">{text}</span>
      <div className="flex space-x-1">
        <span className="loading-pulse" />
        <span className="loading-pulse" />
        <span className="loading-pulse" />
      </div>
    </div>
  );
}