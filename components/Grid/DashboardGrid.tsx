"use client";

import type { ProviderId } from "@/lib/providers/types";
import { useUiStore } from "@/lib/store/ui";
import { Reorder } from "framer-motion";
import { type ReactNode, useEffect } from "react";

interface DashboardGridProps<T extends { id: ProviderId }> {
  items: T[];
  renderItem: (item: T) => ReactNode;
}

export function DashboardGrid<T extends { id: ProviderId }>({
  items,
  renderItem,
}: DashboardGridProps<T>): ReactNode {
  const cardOrder = useUiStore((s) => s.cardOrder);
  const setCardOrder = useUiStore((s) => s.setCardOrder);

  // Reconcile order with currently visible items
  const ids = items.map((i) => i.id);
  const ordered = [
    ...cardOrder.filter((id) => ids.includes(id)),
    ...ids.filter((id) => !cardOrder.includes(id)),
  ];
  const orderedItems = ordered
    .map((id) => items.find((i) => i.id === id))
    .filter((x): x is T => Boolean(x));

  const idsKey = ids.join("|");
  // biome-ignore lint/correctness/useExhaustiveDependencies: idsKey already encodes ids; cardOrder/setCardOrder used inside but tracking them would re-run unnecessarily
  useEffect(() => {
    const missing = ids.filter((id) => !cardOrder.includes(id));
    if (missing.length > 0) {
      setCardOrder([...cardOrder, ...missing]);
    }
  }, [idsKey]);

  const handleReorder = (next: T[]): void => {
    setCardOrder(next.map((n) => n.id));
  };

  return (
    <Reorder.Group
        axis="y"
        values={orderedItems}
        onReorder={handleReorder}
        className="grid w-full gap-5"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}
      >
        {orderedItems.map((item) => (
          <Reorder.Item key={item.id} value={item} as="div" className="list-none">
            {renderItem(item)}
          </Reorder.Item>
        ))}
      </Reorder.Group>
  );
}
