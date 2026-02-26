import { forwardRef } from 'react';
import { cn } from '../../utils/cn.ts';

interface Option {
  value: string;
  label: string;
}

interface FormSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  label?: string;
  error?: string;
  options: Option[];
  fullWidth?: boolean;
  placeholder?: string;
  className?: string;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, options, fullWidth, placeholder, className, ...props }, ref) => {
    return (
      <div className={cn('space-y-1', fullWidth && 'w-full', className)}>
        {label && (
          <label className="block text-sm font-medium text-gray-700">{label}</label>
        )}
        <select
          ref={ref}
          className={cn(
            'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors duration-200',
            error && 'border-danger'
          )}
          aria-invalid={!!error}
          {...props}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-sm text-danger" role="alert">{error}</p>
        )}
      </div>
    );
  }
);

FormSelect.displayName = 'FormSelect';
