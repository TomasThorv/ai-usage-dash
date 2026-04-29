export function formatEvent(event: string, id: string | undefined, data: unknown): string {
  const lines: string[] = [];
  lines.push(`event: ${event}`);
  if (id !== undefined) lines.push(`id: ${id}`);
  const payload = typeof data === "string" ? data : JSON.stringify(data ?? null);
  for (const line of payload.split("\n")) {
    lines.push(`data: ${line}`);
  }
  lines.push("");
  lines.push("");
  return lines.join("\n");
}

export function formatComment(text: string): string {
  return `: ${text}\n\n`;
}
