'use client';

interface BackToTopButtonProps {
  show: boolean;
  onClick: () => void;
}

export default function BackToTopButton({ show, onClick }: BackToTopButtonProps) {
  if (!show) return null;

  return (
    <button
      onClick={onClick}
      className="
        absolute bottom-20 right-4 z-10
        w-10 h-10 rounded-full
        bg-matrix-green/20 border border-matrix-green/50
        text-matrix-green
        flex items-center justify-center
        hover:bg-matrix-green/30 hover:border-matrix-green
        active:scale-95
        transition-all duration-200
        shadow-lg shadow-matrix-green/20
        animate-fade-in
      "
      title="Back to top"
      aria-label="Scroll to top of chat"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    </button>
  );
}
