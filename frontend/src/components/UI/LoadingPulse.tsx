interface LoadingPulseProps {
  text?: string;
}

export default function LoadingPulse({ text = 'Processing' }: LoadingPulseProps) {
  return (
    <div className="flex items-center space-x-3 p-3 bg-matrix-black/40 rounded-lg border-l-4 border-l-matrix-green animate-fade-in">
      <span className="text-2xl">🤖</span>
      <div className="flex items-center space-x-2">
        <span className="text-matrix-green font-mono text-sm">{text}</span>
        <div className="typing-indicator">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}