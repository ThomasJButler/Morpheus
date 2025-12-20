import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'bordered' | 'elevated' | 'interactive' | 'danger';
  glow?: boolean;
  noPadding?: boolean;
  /** Enable animated gradient border effect */
  animatedBorder?: boolean;
  /** Enable corner glow effect */
  cornerGlow?: boolean;
  /** Enable scanline overlay for retro CRT feel */
  scanlines?: boolean;
  /** Click handler - automatically enables interactive styling */
  onClick?: () => void;
}

export default function GlassPanel({
  children,
  className = '',
  variant = 'default',
  glow = false,
  noPadding = false,
  animatedBorder = false,
  cornerGlow = false,
  scanlines = false,
  onClick,
}: GlassPanelProps) {
  // If onClick is provided, treat as interactive
  const isInteractive = variant === 'interactive' || !!onClick;

  const panelContent = (
    <div
      className={clsx(
        'glass-panel transition-all duration-300 relative',
        {
          // Default variant - standard hover effect
          'hover:border-matrix-green/60 hover:shadow-lg hover:shadow-matrix-green/15':
            variant === 'default',

          // Subtle variant - more transparent
          'bg-glass-bg/50 border-matrix-green/15': variant === 'subtle',

          // Bordered variant - thicker border
          'border-2': variant === 'bordered',

          // Elevated variant - more prominent shadow and depth
          'shadow-xl shadow-matrix-green/10 hover:shadow-2xl hover:shadow-matrix-green/20 hover:translate-y-[-2px] border-matrix-green/40':
            variant === 'elevated',

          // Interactive variant - cursor pointer, scale on hover
          'cursor-pointer hover:scale-[1.02] hover:border-matrix-green active:scale-[0.98] select-none':
            isInteractive,

          // Danger variant - red-tinted glass for errors/warnings
          'bg-red-500/5 border-red-500/30 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10':
            variant === 'danger',

          // Glow effect
          'matrix-shadow animate-glow-pulse': glow,

          // Padding
          'p-3 sm:p-6': !noPadding,
        },
        className
      )}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {/* Corner glow effect */}
      {cornerGlow && (
        <>
          <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-matrix-green/20 to-transparent rounded-tl-lg pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-matrix-cyan/20 to-transparent rounded-br-lg pointer-events-none" />
        </>
      )}

      {/* Scanline overlay for retro effect */}
      {scanlines && (
        <div
          className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden opacity-[0.03]"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 255, 0, 0.3) 2px,
              rgba(0, 255, 0, 0.3) 4px
            )`,
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );

  // Wrap with animated border if enabled
  if (animatedBorder) {
    return (
      <div className="border-gradient-animated rounded-lg">
        {panelContent}
      </div>
    );
  }

  return panelContent;
}
