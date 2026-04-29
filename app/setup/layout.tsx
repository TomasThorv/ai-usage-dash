import type { ReactNode } from "react";

export default function SetupLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return <section className="min-h-screen p-8">{children}</section>;
}
