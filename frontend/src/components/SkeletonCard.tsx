import { Skeleton } from "@/components/ui/skeleton";

const SkeletonCard = () => (
  <div className="card-elevated overflow-hidden min-w-[180px]">
    <Skeleton className="aspect-[2/3] w-full" />
    <div className="p-3 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

export default SkeletonCard;
