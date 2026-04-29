import { GradientBackdrop } from "@/components/Background/GradientBackdrop";
import { GridOverlay } from "@/components/Background/GridOverlay";
import { Vignette } from "@/components/Background/Vignette";
import { SetupWizard } from "@/components/SetupWizard/SetupWizard";
import type { ReactNode } from "react";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function SetupPage(): ReactNode {
  return (
    <>
      <GradientBackdrop />
      <GridOverlay />
      <Vignette />
      <Suspense fallback={null}>
        <SetupWizard />
      </Suspense>
    </>
  );
}
