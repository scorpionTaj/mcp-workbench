import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function RegistryLoadingState() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Search and filters skeleton */}
      <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </Card>

      {/* Server cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card
            key={i}
            className="p-6 border-border/50 bg-card/50 backdrop-blur-sm"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <Skeleton className="h-16 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ChatLoadingState() {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
        >
          <Card className="p-4 max-w-[80%] border-border/50 bg-card/50">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}

export function DashboardLoadingState() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-6 border-border/50 bg-card/50">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
