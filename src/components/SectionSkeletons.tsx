// Content-shaped loading states for the lazy-loaded sections in Index.tsx —
// replaces a blank div while the chunk (and its data fetch) loads, so
// navigating to a section doesn't read as a stall.
import { Skeleton } from "@/components/ui/skeleton";

export const DashboardSkeleton = () => (
  <div className="min-h-screen bg-background pb-16">
    <header className="max-w-5xl mx-auto px-6 pt-12 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
        <div className="flex-1 min-w-0 space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-[132px] w-[132px] rounded-full shrink-0" />
      </div>
    </header>
    <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <Skeleton className="h-24 rounded-sm md:col-span-2" />
      <Skeleton className="h-24 rounded-sm" />
      <Skeleton className="h-32 rounded-sm" />
      <Skeleton className="h-32 rounded-sm" />
      <Skeleton className="h-32 rounded-sm" />
    </div>
  </div>
);

export const AnalyticsSkeleton = () => (
  <div className="min-h-screen bg-background pb-16">
    <header className="max-w-4xl mx-auto px-6 pt-12 pb-8 space-y-3">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-9 w-56" />
    </header>
    <div className="max-w-4xl mx-auto px-6 space-y-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-20 rounded-sm" />
      ))}
    </div>
  </div>
);

export const ProgressSkeleton = () => (
  <div className="min-h-screen bg-background pb-16">
    <header className="max-w-4xl mx-auto px-6 pt-12 pb-8 space-y-3">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-4 w-64" />
    </header>
    <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 rounded-sm" />
      ))}
    </div>
    <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28 rounded-sm" />
      ))}
    </div>
  </div>
);

export const WorkshopSkeleton = () => (
  <div className="min-h-screen bg-background pb-16">
    <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
      <Skeleton className="h-5 w-24" />
    </div>
    <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-2 gap-4">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <Skeleton key={i} className="h-28 rounded-sm" />
      ))}
    </div>
  </div>
);

export const SettingsSkeleton = () => (
  <div className="min-h-screen bg-background pb-16">
    <header className="max-w-3xl mx-auto px-6 pt-12 pb-8 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-9 w-64" />
    </header>
    <div className="max-w-3xl mx-auto px-6 space-y-6">
      <Skeleton className="h-40 rounded-sm" />
      <Skeleton className="h-32 rounded-sm" />
      <Skeleton className="h-28 rounded-sm" />
    </div>
  </div>
);
