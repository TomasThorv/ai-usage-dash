"use client";

import { Card } from "@/components/Card/Card";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, RotateCw } from "lucide-react";
import type { ReactNode } from "react";

interface CardErrorProps {
  code?: string;
  message: string;
  onRetry?: () => void;
}

export function CardError({ code, message, onRetry }: CardErrorProps): ReactNode {
  return (
    <Card className="border-error/40 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 text-error" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-error">
            {code ? `Error · ${code}` : "Error"}
          </p>
          <p className="mt-1 break-words text-xs text-fg-muted">{message}</p>
        </div>
      </div>
      {onRetry ? (
        <div className="mt-4 flex justify-end">
          <Button variant="danger" size="sm" onClick={onRetry}>
            <RotateCw aria-hidden="true" className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
