import claudeFx from "@/lib/providers/_fixtures/claude.json";
import copilotFx from "@/lib/providers/_fixtures/copilot.json";
import cursorFx from "@/lib/providers/_fixtures/cursor.json";
import geminiFx from "@/lib/providers/_fixtures/gemini.json";
import openaiFx from "@/lib/providers/_fixtures/openai.json";
import { http, type HttpHandler, HttpResponse } from "msw";

// Default handlers using the fixture payloads. Tests may use server.use(...)
// to replace specific handlers (e.g. assert 401 for verify failures).

export const claudeHandlers: HttpHandler[] = [
  http.get("https://api.anthropic.com/v1/organizations/usage_report/messages", () =>
    HttpResponse.json(claudeFx.usage),
  ),
  http.get("https://api.anthropic.com/v1/organizations/cost_report", () =>
    HttpResponse.json(claudeFx.cost),
  ),
];

export const openaiHandlers: HttpHandler[] = [
  http.get("https://api.openai.com/v1/organization/usage/completions", () =>
    HttpResponse.json(openaiFx.usage),
  ),
  http.get("https://api.openai.com/v1/organization/costs", () => HttpResponse.json(openaiFx.cost)),
];

export const cursorApiKeyHandlers: HttpHandler[] = [
  http.post("https://api.cursor.com/teams/filtered-usage-events", () =>
    HttpResponse.json(cursorFx.apiKey.events),
  ),
  http.post("https://api.cursor.com/teams/spend", () => HttpResponse.json(cursorFx.apiKey.spend)),
];

export const cursorCookieHandlers: HttpHandler[] = [
  http.post("https://cursor.com/api/dashboard/get-current-period-usage", () =>
    HttpResponse.json(cursorFx.cookie.currentPeriod),
  ),
];

export const geminiHandlers: HttpHandler[] = [
  http.post("https://oauth2.googleapis.com/token", () =>
    HttpResponse.json({ access_token: "test-token", expires_in: 3600, token_type: "Bearer" }),
  ),
  http.get(
    "https://cloudquotas.googleapis.com/v1/projects/:project/locations/global/services/generativelanguage.googleapis.com/quotaInfos",
    () => HttpResponse.json(geminiFx),
  ),
];

export const copilotHandlers: HttpHandler[] = [
  http.get("https://api.github.com/orgs/:org/copilot/billing", () =>
    HttpResponse.json(copilotFx.billing),
  ),
  http.get("https://api.github.com/orgs/:org/copilot/metrics/reports/organization-1-day", () =>
    HttpResponse.json(copilotFx.metricsIndex),
  ),
  http.get("https://example.com/copilot-metrics.json.gz", () =>
    HttpResponse.json(copilotFx.metricsBlob),
  ),
];

export const handlers: HttpHandler[] = [
  ...claudeHandlers,
  ...openaiHandlers,
  ...cursorApiKeyHandlers,
  ...cursorCookieHandlers,
  ...geminiHandlers,
  ...copilotHandlers,
];
