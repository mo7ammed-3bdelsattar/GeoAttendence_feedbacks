import { Plus, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn.ts';

interface QuickCreateButtonProps {
  label: string;
  onClick?: () => void;
  to?: string;
  icon?: LucideIcon;
  className?: string;
  disabled?: boolean;
}

export function QuickCreateButton({ 
  label, 
  onClick, 
  to,
  icon: Icon = Plus, 
  className,
  disabled 
}: QuickCreateButtonProps) {
  const buttonClassName = cn(
    "flex items-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl font-bold shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:scale-100",
    "shadow-primary/40 hover:scale-105"
  );

  return (
    <div className={cn("fixed bottom-8 right-8 z-20", className)}>
      {to ? (
        <Link to={to} className={buttonClassName}>
          <Icon className="h-5 w-5" />
          {label}
        </Link>
      ) : (
        <button
          onClick={onClick}
          disabled={disabled}
          className={buttonClassName}
        >
          <Icon className="h-5 w-5" />
          {label}
        </button>
      )}
    </div>
  );
}
