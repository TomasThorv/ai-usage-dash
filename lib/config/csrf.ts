// Centralized CSRF cookie name. The `__Host-` prefix locks the cookie to the
// origin and requires Secure — but browsers refuse to store Secure cookies
// served over plain HTTP, which is the protocol used by the e2e harness against
// a prod-built local server. When TEST_INSECURE_COOKIES=1 we drop the prefix
// so the same wire-level CSRF flow can be exercised under HTTP loopback.
//
// We read both the server-only var and the public mirror so the client bundle
// (which never sees plain `process.env.TEST_INSECURE_COOKIES` at runtime) can
// stay in sync with the middleware decision.
const TEST_INSECURE =
  process.env.TEST_INSECURE_COOKIES === "1" ||
  process.env.NEXT_PUBLIC_TEST_INSECURE_COOKIES === "1";
export const CSRF_COOKIE: string = TEST_INSECURE ? "csrf" : "__Host-csrf";
