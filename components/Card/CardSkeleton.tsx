import { Card } from "@/components/Card/Card";
import type { ReactNode } from "react";

export function CardSkeleton(): ReactNode {
  return (
    <Card className="p-5">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="shimmer h-8 w-8 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="shimmer h-3 w-2/3 rounded" />
            <div className="shimmer h-2 w-1/3 rounded" />
          </div>
          <div className="shimmer h-2.5 w-2.5 rounded-full" />
        </div>
        <div className="shimmer h-3 w-full rounded" />
        <div className="shimmer h-3 w-5/6 rounded" />
        <div className="shimmer h-24 w-24 rounded-full" />
      </div>
      <style>{`
        .shimmer {
          background: linear-gradient(
            100deg,
            rgba(255,255,255,0.04) 30%,
            rgba(255,255,255,0.12) 50%,
            rgba(255,255,255,0.04) 70%
          );
          background-size: 200% 100%;
          animation: shimmer-bg 1.4s infinite linear;
        }
        @keyframes shimmer-bg {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .shimmer { animation: none; }
        }
      `}</style>
    </Card>
  );
}
