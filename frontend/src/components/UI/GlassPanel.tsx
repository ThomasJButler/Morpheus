import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'bordered';
  glow?: boolean;
}

export default function GlassPanel({
  children,
  className = '',
  variant = 'default',
  glow = false,
}: GlassPanelProps) {
  return (
    <div
      className={clsx(
        'glass-panel transition-all duration-300',
        {
          'hover:border-matrix-green hover:shadow-lg hover:shadow-matrix-green/20':
            variant === 'default',
          'bg-glass-bg/50': variant === 'subtle',
          'border-2': variant === 'bordered',
          'matrix-shadow': glow,
        },
        className
      )}
    >
      {children}
    </div>
  );
}