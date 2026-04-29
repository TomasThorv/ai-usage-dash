// CSRF cookie name. Plain `csrf` (no `__Host-` prefix) so the cookie works
// over plain HTTP loopback (`pnpm start` on http://localhost) without the
// browser silently rejecting it. SameSite=Strict still gives the CSRF
// guarantee; the `__Host-` extra is subdomain isolation we don't need.
export const CSRF_COOKIE = "csrf" as const;
