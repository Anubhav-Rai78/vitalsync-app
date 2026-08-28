import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that don't require a signed-in session.
const PUBLIC_ROUTES = ["/login", "/register"];

// Routes restricted to specific roles. Anything not listed here is open
// to any signed-in staff member. The real security boundary is Postgres
// RLS (see supabase/migrations) — this is UX-level nav gating only.
const ROLE_ROUTES: Record<string, Array<"admin" | "doctor" | "front_desk">> = {
  "/settings": ["admin"],
  "/settings/audit-log": ["admin"],
  "/settings/system-health": ["admin"],
  "/reports": ["admin"],
  "/prescriptions/new": ["doctor"],
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_ROUTES.some((r) => path.startsWith(r));

  if (!user && !isPublic) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectedFrom", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Role gating for restricted routes.
  if (user) {
    const restrictedFor = Object.entries(ROLE_ROUTES).find(([route]) =>
      path.startsWith(route)
    );
    if (restrictedFor) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const allowedRoles = restrictedFor[1];
      if (!profile || !allowedRoles.includes(profile.role as any)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
