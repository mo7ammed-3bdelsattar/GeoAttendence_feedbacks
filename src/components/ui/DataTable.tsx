import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn.ts';

export interface Column<T> {
  id: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  pageSize?: number;
  searchPlaceholder?: string;
  onSearch?: (term: string) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  pageSize = 10,
  searchPlaceholder = 'Search...',
  onSearch,
  className,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.id === sortKey);
    if (!col || !('sortable' in col) || !col.sortable) return data;
    return [...data].sort((a, b) => {
      const aVal = String((col.accessor as (r: T) => unknown)(a) ?? '');
      const bVal = String((col.accessor as (r: T) => unknown)(b) ?? '');
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [data, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageData = sorted.slice(page * pageSize, page * pageSize + pageSize);

  const handleSort = (id: string) => {
    const col = columns.find((c) => c.id === id);
    if (!col?.sortable) return;
    if (sortKey === id) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(id);
      setSortDir('asc');
    }
  };

  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white overflow-hidden', className)}>
      {onSearch && (
        <div className="p-3 border-b border-gray-200">
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              onSearch(e.target.value);
            }}
            className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={cn(
                    'px-4 py-3 text-left font-medium text-gray-700',
                    col.sortable && 'cursor-pointer select-none hover:bg-gray-100'
                  )}
                  onClick={() => col.sortable && handleSort(col.id)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row) => (
              <tr key={keyExtractor(row)} className="border-b border-gray-100 hover:bg-gray-50/50">
                {columns.map((col) => (
                  <td key={col.id} className="px-4 py-3 text-gray-900">
                    {col.accessor(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
