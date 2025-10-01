import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
  children?: React.ReactNode;
}

export function SkeletonCard({ className, children }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "animate-pulse-glow rounded-lg border bg-card text-card-foreground shadow-sm transition-opacity duration-500 ease-in-out",
        className
      )}
    >
      {children}
    </div>
  );
}

interface SkeletonContentProps {
  lines?: number;
  showAvatar?: boolean;
  showBadge?: boolean;
  showActions?: boolean;
}

export function SkeletonContent({
  lines = 3,
  showAvatar = false,
  showBadge = false,
  showActions = false,
}: SkeletonContentProps) {
  return (
    <>
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {showAvatar && (
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse-glow" />
            )}
            <div className="space-y-2">
              <div className="h-5 w-32 bg-muted rounded animate-pulse-glow" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse-glow" />
            </div>
          </div>
          {showBadge && (
            <div className="h-6 w-16 bg-muted rounded animate-pulse-glow" />
          )}
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-4 bg-muted rounded animate-pulse-glow",
                i === lines - 1 ? "w-3/4" : "w-full"
              )}
            />
          ))}
        </div>

        {showActions && (
          <div className="flex gap-2 mt-4">
            <div className="h-8 w-20 bg-muted rounded animate-pulse-glow" />
            <div className="h-8 w-20 bg-muted rounded animate-pulse-glow" />
          </div>
        )}
      </div>
    </>
  );
}
