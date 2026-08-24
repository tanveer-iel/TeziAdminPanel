import React from "react";

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "h-4 w-full" }) => (
  <div className={`animate-pulse rounded-md bg-gray-100 dark:bg-white/[0.06] ${className}`} />
);

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 6, cols = 4 }) => (
  <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex items-center gap-6 px-4 py-2.5">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-3.5 flex-1" />
        ))}
      </div>
    ))}
  </div>
);
