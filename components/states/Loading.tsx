import { Skeleton } from '@/components/ui/skeleton';

export const ModelsLoader = () => (
  <div className="flex flex-col gap-4 w-full">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-3 p-3 border-b border-border"
      >
        <Skeleton className="size-10 rounded-lg shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="w-1/2 h-4" />
          <Skeleton className="w-1/4 h-3" />
        </div>
      </div>
    ))}
  </div>
);

export const ChatsLoader = () => (
  <div className="flex flex-col w-full">
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-3 p-3 border-b border-border"
      >
        <Skeleton className="size-11 rounded-xl shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="w-3/5 h-4" />
          <Skeleton className="w-2/5 h-3" />
        </div>
        <Skeleton className="w-8 h-3 shrink-0" />
      </div>
    ))}
  </div>
);
