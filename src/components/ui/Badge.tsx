import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'news' | 'movie' | 'social' | 'audio' | 'demo';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const baseStyles =
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';

  const variants = {
    default: 'bg-primary/10 text-primary border border-primary/20',
    secondary: 'bg-secondary text-secondary-foreground',
    outline: 'border border-border text-foreground',
    news: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    movie: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    social: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    audio: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20',
    demo: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-medium',
  };

  return <div className={twMerge(clsx(baseStyles, variants[variant], className))} {...props} />;
}
