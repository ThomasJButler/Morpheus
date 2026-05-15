import { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  isLoading?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  isLoading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'font-mono transition-all duration-200 rounded-md inline-flex items-center justify-center';

  const variants = {
    primary: 'matrix-button',
    secondary: 'bg-transparent border border-matrix-green/30 text-matrix-green/80 hover:border-matrix-green/60 hover:bg-matrix-green/10 hover:text-matrix-green',
    ghost: 'bg-transparent text-matrix-green hover:bg-matrix-green/10',
  };

  const sizes = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        {
          'opacity-50 cursor-not-allowed': disabled || isLoading,
        },
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="mr-2">Loading</span>
          <span className="loading-pulse" />
        </>
      ) : (
        children
      )}
    </button>
  );
}