import { forwardRef } from 'react';
import { cn } from '../../utils/cn.ts';

interface FormDateTimeProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className' | 'type'> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  type?: 'date' | 'time' | 'datetime-local';
}

export const FormDateTime = forwardRef<HTMLInputElement, FormDateTimeProps>(
  ({ label, error, fullWidth, type = 'datetime-local', ...props }, ref) => {
    return (
      <div className={cn('space-y-1', fullWidth && 'w-full')}>
        {label && (
          <label className="block text-sm font-medium text-gray-700">{label}</label>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors duration-200',
            error && 'border-danger'
          )}
          aria-invalid={!!error}
          {...props}
        />
        {error && (
          <p className="text-sm text-danger" role="alert">{error}</p>
        )}
      </div>
    );
  }
);

FormDateTime.displayName = 'FormDateTime';
