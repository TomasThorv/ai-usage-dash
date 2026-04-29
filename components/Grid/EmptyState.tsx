import { Button } from "@/components/ui/Button";
import Link from "next/link";
import type { ReactNode } from "react";

export function EmptyState(): ReactNode {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 200 200"
        className="h-40 w-40"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="empty-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent-cyan)" />
            <stop offset="100%" stopColor="var(--color-accent-violet)" />
          </linearGradient>
        </defs>
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="url(#empty-grad)"
          strokeOpacity="0.25"
          strokeWidth="2"
        />
        <circle
          cx="100"
          cy="100"
          r="56"
          fill="none"
          stroke="url(#empty-grad)"
          strokeOpacity="0.45"
          strokeWidth="2"
        />
        <circle cx="100" cy="100" r="28" fill="url(#empty-grad)" fillOpacity="0.15" />
        <path
          d="M100 70 L106 94 L130 100 L106 106 L100 130 L94 106 L70 100 L94 94 Z"
          fill="url(#empty-grad)"
        />
      </svg>
      <h2 className="mt-6 text-2xl font-semibold text-text-primary">No providers connected</h2>
      <p className="mt-2 text-sm text-text-muted">
        Connect your first provider to start streaming live usage and quota data.
      </p>
      <div className="mt-6">
        <Link href="/setup">
          <Button variant="primary">Connect your first provider</Button>
        </Link>
      </div>
    </div>
  );
}
