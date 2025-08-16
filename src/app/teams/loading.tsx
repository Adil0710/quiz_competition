import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingTeams() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Search */}
      <div className="border rounded-lg p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Table-style rows matching columns */}
      <div className="border rounded-lg p-6 space-y-2">
        {/* header row skeleton */}
        <div className="grid grid-cols-12 gap-4 items-center">
          <Skeleton className="col-span-3 h-5" />
          <Skeleton className="col-span-3 h-5" />
          <Skeleton className="col-span-1 h-5" />
          <Skeleton className="col-span-1 h-5" />
          <Skeleton className="col-span-1 h-5" />
          <Skeleton className="col-span-1 h-5" />
          <Skeleton className="col-span-2 h-5" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="grid grid-cols-12 gap-4 items-center">
            <Skeleton className="col-span-3 h-6" />
            <Skeleton className="col-span-3 h-6" />
            <Skeleton className="col-span-1 h-6" />
            <Skeleton className="col-span-1 h-6" />
            <Skeleton className="col-span-1 h-6" />
            <Skeleton className="col-span-1 h-6" />
            <Skeleton className="col-span-2 h-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
