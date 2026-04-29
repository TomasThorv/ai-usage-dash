"use client";

import { Card } from "@/components/Card/Card";
import { StepKeyEntry } from "@/components/SetupWizard/StepKeyEntry";
import { StepProgress } from "@/components/SetupWizard/StepProgress";
import { StepProviderSelect } from "@/components/SetupWizard/StepProviderSelect";
import { StepReview } from "@/components/SetupWizard/StepReview";
import type { ProviderId } from "@/lib/providers/types";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";

type Step = "select" | "keys" | "verify";
const ALL_STEPS: Step[] = ["select", "keys", "verify"];
const VALID_PROVIDERS: ProviderId[] = [
  "claude",
  "openai",
  "cursor",
  "opencode",
  "gemini",
  "copilot",
];

function isProviderId(s: string): s is ProviderId {
  return (VALID_PROVIDERS as string[]).includes(s);
}

export function SetupWizard(): ReactNode {
  const router = useRouter();
  const params = useSearchParams();
  const stepParam = params.get("step") ?? "select";
  const step: Step = (ALL_STEPS as string[]).includes(stepParam) ? (stepParam as Step) : "select";
  const providersParam = params.get("providers") ?? "";

  const initialSelected = useMemo<ProviderId[]>(() => {
    return providersParam
      .split(",")
      .map((s) => s.trim())
      .filter(isProviderId);
  }, [providersParam]);

  const [selected, setSelected] = useState<ProviderId[]>(initialSelected);
  const [verified, setVerified] = useState<ProviderId[]>([]);

  const stepIndex = ALL_STEPS.indexOf(step) + 1;

  const goto = (next: Step, overrides: { providers?: ProviderId[] } = {}): void => {
    const sp = new URLSearchParams();
    sp.set("step", next);
    const provs = overrides.providers ?? selected;
    if (provs.length > 0) sp.set("providers", provs.join(","));
    router.push(`/setup?${sp.toString()}`);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-[720px] p-6 sm:p-8">
        <StepProgress step={stepIndex} total={3} labels={["Select", "Keys", "Verify"]} />
        <div className="mt-6">
          {step === "select" ? (
            <StepProviderSelect
              selected={selected}
              onSelect={setSelected}
              onNext={() => goto("keys", { providers: selected })}
            />
          ) : null}
          {step === "keys" ? (
            <StepKeyEntry
              selected={selected}
              onVerified={setVerified}
              onBack={() => goto("select")}
              onNext={() => goto("verify")}
            />
          ) : null}
          {step === "verify" ? (
            <StepReview verified={verified} onBack={() => goto("keys")} />
          ) : null}
        </div>
      </Card>
    </main>
  );
}
