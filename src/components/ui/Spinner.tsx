import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function Spinner({ size = 'md', label = 'Loading...', className, ...props }: SpinnerProps) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-10 w-10 border-3',
  };

  return (
    <div
      role="status"
      aria-label={label}
      className={twMerge(clsx('flex items-center justify-center', className))}
      {...props}
    >
      <div
        className={twMerge(
          clsx('animate-spin rounded-full border-primary border-t-transparent', sizes[size])
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
