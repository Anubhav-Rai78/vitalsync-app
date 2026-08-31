import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROLE_ROUTES: Record<string, string[]> = {
  "/settings/clinic": ["admin"],
  "/settings/team": ["admin"],
  "/settings/audit-log": ["admin"],
  "/prescriptions/new": ["doctor", "admin", "front_desk"],
  "/prescriptions": ["doctor", "admin", "front_desk"],
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Unauthenticated users trying to access protected dashboard routes
  if (
    !user &&
    (path.startsWith("/dashboard") ||
      path.startsWith("/patients") ||
      path.startsWith("/doctors") ||
      path.startsWith("/appointments") ||
      path.startsWith("/prescriptions") ||
      path.startsWith("/settings"))
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role verification for restricted routes
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
      const userRole = profile?.role?.toLowerCase() || "admin";

      if (!allowedRoles.includes(userRole)) {
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
