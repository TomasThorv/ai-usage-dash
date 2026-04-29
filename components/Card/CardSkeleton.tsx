import { Card } from "@/components/Card/Card";
import type { ReactNode } from "react";

export function CardSkeleton(): ReactNode {
  return (
    <Card className="p-6 animate-pulse">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-surface-hover" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded bg-surface-hover" />
            <div className="h-2 w-1/3 rounded bg-surface-hover" />
          </div>
          <div className="h-2.5 w-2.5 rounded-full bg-surface-hover" />
        </div>
        <div className="h-3 w-full rounded bg-surface-hover" />
        <div className="h-3 w-5/6 rounded bg-surface-hover" />
        <div className="h-24 w-24 rounded-full bg-surface-hover" />
      </div>
    </Card>
  );
}
