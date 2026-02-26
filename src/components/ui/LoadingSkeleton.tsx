import { cn } from '../../utils/cn.ts';

interface LoadingSkeletonProps {
  className?: string;
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return <div className={cn('animate-pulse rounded-lg bg-gray-200', className)} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <LoadingSkeleton className="h-4 w-24 mb-3" />
      <LoadingSkeleton className="h-8 w-32 mb-2" />
      <LoadingSkeleton className="h-3 w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex border-b border-gray-200 bg-gray-50 p-3 gap-4">
        <LoadingSkeleton className="h-4 flex-1" />
        <LoadingSkeleton className="h-4 flex-1" />
        <LoadingSkeleton className="h-4 w-24" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex border-b border-gray-100 p-3 gap-4">
          <LoadingSkeleton className="h-4 flex-1" />
          <LoadingSkeleton className="h-4 flex-1" />
          <LoadingSkeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
