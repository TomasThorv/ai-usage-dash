import { CSRF_COOKIE } from "@/lib/config/csrf";
import { type NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

const TEST_INSECURE = process.env.TEST_INSECURE_COOKIES === "1";

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] as number);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function issueCsrfToken(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return bytesToBase64Url(buf);
}

export function middleware(req: NextRequest): NextResponse {
  const response = NextResponse.next();
  const existing = req.cookies.get(CSRF_COOKIE)?.value;
  if (!existing) {
    const isProd = process.env.NODE_ENV === "production";
    response.cookies.set({
      name: CSRF_COOKIE,
      value: issueCsrfToken(),
      sameSite: "strict",
      secure: isProd && !TEST_INSECURE,
      httpOnly: false,
      path: "/",
    });
  }
  return response;
}
