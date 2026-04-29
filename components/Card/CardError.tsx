"use client";

import { Card } from "@/components/Card/Card";
import { Button } from "@/components/ui/Button";
import { AlertCircle, RotateCw } from "lucide-react";
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
        <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 text-error" />
        <p className="font-mono text-[12px] text-error leading-relaxed">
          {code ? `${code}: ${message}` : message}
        </p>
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
