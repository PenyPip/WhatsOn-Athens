import { Skeleton } from "@/components/ui/skeleton";

export const SkeletonCard = () => (
  <div className="glass-card rounded-lg overflow-hidden">
    <Skeleton className="aspect-[2/3] w-full bg-secondary" />
    <div className="p-3 space-y-2">
      <Skeleton className="h-4 w-3/4 bg-secondary" />
      <Skeleton className="h-3 w-1/2 bg-secondary" />
    </div>
  </div>
);

export default SkeletonCard;
