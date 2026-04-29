import type { ProviderId } from "@/lib/providers/types";
import type { ReactNode } from "react";

const HELP: Record<ProviderId, { title: string; body: string; link?: string }> = {
  claude: {
    title: "Claude (Anthropic)",
    body: "Create an Admin API key in the Anthropic Console under Settings → Admin Keys. The key starts with sk-ant-admin01-…",
    link: "https://console.anthropic.com/settings/admin-keys",
  },
  openai: {
    title: "OpenAI",
    body: "Use an Admin API key from platform.openai.com → Organization → Admin Keys. Starts with sk-admin-…",
    link: "https://platform.openai.com/settings/organization/admin-keys",
  },
  cursor: {
    title: "Cursor",
    body: "Team plan: copy the API key from cursor.com/settings → Team → API. Individual users may paste their session cookie value (best-effort).",
    link: "https://cursor.com/settings",
  },
  opencode: {
    title: "OpenCode",
    body: "Reads your local SQLite usage db. No key required — confirm the db path in Settings later.",
  },
  gemini: {
    title: "Gemini (Google)",
    body: "Provide a service-account JSON with the cloud-platform scope. Surfaces quota ceilings only.",
    link: "https://console.cloud.google.com/iam-admin/serviceaccounts",
  },
  copilot: {
    title: "GitHub Copilot",
    body: "Create a PAT with manage_billing:copilot or read:org. Org admin required. Provide your org slug.",
    link: "https://github.com/settings/tokens",
  },
};

export function KeyHelpPanel({ providerId }: { providerId: ProviderId }): ReactNode {
  const help = HELP[providerId];
  return (
    <aside className="rounded-xl border border-border bg-bg/40 p-4">
      <h4 className="text-sm font-semibold text-fg">{help.title}</h4>
      <p className="mt-2 text-xs leading-relaxed text-fg-muted">{help.body}</p>
      {help.link ? (
        <a
          href={help.link}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 inline-block text-xs text-accent hover:underline"
        >
          Open provider console →
        </a>
      ) : null}
    </aside>
  );
}
