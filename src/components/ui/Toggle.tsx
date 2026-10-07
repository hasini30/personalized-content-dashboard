import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
  className,
}: ToggleProps) {
  const generatedId = React.useId();
  const toggleId = id || generatedId;

  return (
    <div className={twMerge(clsx('flex items-center justify-between gap-3', className))}>
      {label && (
        <div className="flex flex-col">
          <label
            htmlFor={toggleId}
            className="text-sm font-medium text-foreground cursor-pointer select-none"
          >
            {label}
          </label>
          {description && <span className="text-xs text-muted-foreground">{description}</span>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        id={toggleId}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={twMerge(
          clsx(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            checked ? 'bg-primary' : 'bg-muted'
          )
        )}
      >
        <span
          className={twMerge(
            clsx(
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
              checked ? 'translate-x-5' : 'translate-x-0'
            )
          )}
        />
      </button>
    </div>
  );
}
