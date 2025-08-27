import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingColleges() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Table-style rows matching columns: Name(3) Code(2) Address(3) Contact(2) Actions(2) */}
      <div className="border rounded-lg p-6 space-y-2">
        {/* header row skeleton */}
        <div className="grid grid-cols-12 gap-4 items-center">
          <Skeleton className="col-span-3 h-5" />
          <Skeleton className="col-span-2 h-5" />
          <Skeleton className="col-span-3 h-5" />
          <Skeleton className="col-span-2 h-5" />
          <Skeleton className="col-span-2 h-5" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="grid grid-cols-12 gap-4 items-center">
            <Skeleton className="col-span-3 h-6" />
            <Skeleton className="col-span-2 h-6" />
            <Skeleton className="col-span-3 h-6" />
            <Skeleton className="col-span-2 h-6" />
            <Skeleton className="col-span-2 h-10" />
          </div>
        ))}
      </div>
    </div>
  );
}
