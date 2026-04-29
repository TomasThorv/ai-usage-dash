import { SetupWizard } from "@/components/SetupWizard/SetupWizard";
import type { ReactNode } from "react";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function SetupPage(): ReactNode {
  return (
    <>
      <Suspense fallback={null}>
        <SetupWizard />
      </Suspense>
    </>
  );
}
