import Link from "next/link";
import type { ReactNode } from "react";

export function EmptyState(): ReactNode {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <p className="text-sm text-fg-muted">
        No providers connected.{" "}
        <Link href="/setup" className="text-fg underline underline-offset-2 hover:text-fg-muted transition-colors">
          Add your first provider
        </Link>
      </p>
    </div>
  );
}
