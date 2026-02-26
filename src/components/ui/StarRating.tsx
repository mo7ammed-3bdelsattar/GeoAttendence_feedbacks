import { Star } from 'lucide-react';
import { cn } from '../../utils/cn.ts';

interface StarRatingDisplayProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function StarRatingDisplay({ value, max = 5, size = 'md', className }: StarRatingDisplayProps) {
  const full = Math.floor(value);
  const half = value - full >= 0.5 ? 1 : 0;
  const empty = max - full - half;
  const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div className={cn('flex items-center gap-0.5', className)} role="img" aria-label={`${value} out of ${max} stars`}>
      {Array.from({ length: full }, (_, i) => (
        <Star key={`f-${i}`} className={cn(sizeClass, 'fill-secondary text-secondary')} />
      ))}
      {half === 1 && <Star className={cn(sizeClass, 'fill-secondary/50 text-secondary')} />}
      {Array.from({ length: empty }, (_, i) => (
        <Star key={`e-${i}`} className={cn(sizeClass, 'text-gray-300')} />
      ))}
    </div>
  );
}

interface StarRatingInputProps {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  label?: string;
  className?: string;
}

export function StarRatingInput({ value, onChange, max = 5, label, className }: StarRatingInputProps) {
  return (
    <div className={className}>
      {label && <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>}
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 transition-transform duration-200 hover:scale-110"
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              className={cn('h-8 w-8 transition-colors duration-200', value >= star ? 'fill-secondary text-secondary' : 'text-gray-300')}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
