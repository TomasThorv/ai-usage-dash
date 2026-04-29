"use client";

import { Button } from "@/components/ui/Button";
import type { ProviderId } from "@/lib/providers/types";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface StepReviewProps {
  verified: ProviderId[];
  onBack: () => void;
}

export function StepReview({ verified, onBack }: StepReviewProps): ReactNode {
  const router = useRouter();
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-medium text-fg">Ready to go</h2>
        <p className="mt-1 text-sm text-fg-muted">
          {verified.length} provider{verified.length === 1 ? "" : "s"} verified.
        </p>
      </div>

      <ul className="space-y-1.5">
        {verified.map((id) => (
          <li
            key={id}
            className="flex items-center gap-2 rounded-card border border-ok/30 bg-ok/5 px-3 py-2 text-sm"
          >
            <CheckCircle2 className="h-4 w-4 text-ok" aria-hidden="true" />
            <span className="font-medium text-fg capitalize">{id}</span>
          </li>
        ))}
        {verified.length === 0 ? (
          <li className="text-sm text-fg-muted">
            No providers verified yet — go back and verify at least one.
          </li>
        ) : null}
      </ul>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={() => router.push("/")} disabled={verified.length === 0}>
          Finish
        </Button>
      </div>
    </div>
  );
}
