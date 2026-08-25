import React from 'react';

interface SkeletonProps {
  className?: string;
}

/** Shimmer line skeleton */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`rounded-lg animate-shimmer ${className}`} />
);

/** Skeleton for a KPI/stat card */
export const SkeletonCard: React.FC = () => (
  <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 space-y-4 animate-enter">
    <div className="flex justify-between items-center">
      <Skeleton className="w-10 h-10 rounded-xl" />
      <Skeleton className="w-16 h-5 rounded-full" />
    </div>
    <Skeleton className="w-24 h-3 rounded" />
    <Skeleton className="w-32 h-7 rounded" />
    <Skeleton className="w-40 h-3 rounded" />
  </div>
);

/** Skeleton for a Kanban column */
export const SkeletonKanbanColumn: React.FC = () => (
  <div className="flex flex-col w-[82vw] sm:w-[320px] shrink-0 h-full bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden">
    <div className="p-4 border-t-4 border-zinc-700 bg-black/40 flex items-center justify-between">
      <Skeleton className="w-28 h-4 rounded" />
      <Skeleton className="w-8 h-6 rounded-full" />
    </div>
    <div className="flex-1 p-4 space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className={`p-5 rounded-2xl bg-zinc-800/50 border border-white/5 space-y-3 animate-enter stagger-${i}`}>
          <Skeleton className="w-3/4 h-4 rounded" />
          <Skeleton className="w-1/2 h-3 rounded" />
          <div className="flex justify-between pt-2 border-t border-white/5">
            <Skeleton className="w-12 h-5 rounded" />
            <Skeleton className="w-6 h-6 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** Skeleton for a list row */
export const SkeletonListRow: React.FC<{ index?: number }> = ({ index = 0 }) => (
  <div className={`flex items-center gap-4 px-5 py-4 border-b border-white/5 animate-enter stagger-${Math.min(index + 1, 6)}`}>
    <Skeleton className="w-2 h-2 rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="w-48 h-4 rounded" />
      <Skeleton className="w-32 h-3 rounded" />
    </div>
    <Skeleton className="w-16 h-5 rounded-full" />
    <Skeleton className="w-20 h-4 rounded" />
  </div>
);

/** Full-page loading skeleton */
export const SkeletonPage: React.FC = () => (
  <div className="space-y-6 animate-enter">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <Skeleton className="w-48 h-8 rounded-lg" />
        <Skeleton className="w-64 h-4 rounded" />
      </div>
      <Skeleton className="w-32 h-10 rounded-xl" />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
    <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6">
      <Skeleton className="w-40 h-5 rounded mb-4" />
      <Skeleton className="w-full h-[200px] rounded-xl" />
    </div>
  </div>
);
