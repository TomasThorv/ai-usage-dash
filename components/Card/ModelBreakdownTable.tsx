"use client";

import type { UsageSnapshotModelEntry } from "@/lib/providers/types";
import { cn } from "@/lib/utils/cn";
import { formatNumber, formatUsd } from "@/lib/utils/format";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

interface ModelBreakdownTableProps {
  rows: ReadonlyArray<UsageSnapshotModelEntry>;
  open: boolean;
}

export function ModelBreakdownTable({ rows, open }: ModelBreakdownTableProps): ReactNode {
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="breakdown"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="mt-3 rounded-xl border border-border-faint bg-bg-deep/40">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="text-text-faint">
                  <th className="px-3 py-2 font-medium">Model</th>
                  <th className="px-3 py-2 text-right font-medium">In</th>
                  <th className="px-3 py-2 text-right font-medium">Out</th>
                  <th className="px-3 py-2 text-right font-medium">Reqs</th>
                  <th className="px-3 py-2 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-center text-text-faint">
                      No model data
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr
                      key={r.model}
                      className={cn(
                        "border-t border-border-faint",
                        i % 2 === 1 && "bg-surface-glass/40",
                      )}
                    >
                      <td className="truncate px-3 py-1.5 text-text-primary" title={r.model}>
                        {r.model}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums text-text-muted">
                        {formatNumber(r.inputTokens)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums text-text-muted">
                        {formatNumber(r.outputTokens)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums text-text-muted">
                        {formatNumber(r.requests)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums text-text-primary">
                        {formatUsd(r.costUsd)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
