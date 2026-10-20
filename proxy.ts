import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isAuthPage = pathname === "/signup" || pathname === "/login" || pathname === "/admin/login";
  const isSellerPortal = pathname === "/seller" || pathname.startsWith("/seller/");
  const isApiRoute = pathname.startsWith("/api/");
  const isAuthRoute = pathname.startsWith("/auth/");

  // 1. Authenticated users (Customer, Seller, Admin)
  if (user) {
    // If already registered and logged in, redirect away from signup/login pages to storefront or target
    if (pathname === "/signup" || pathname === "/login") {
      const next = request.nextUrl.searchParams.get("next");
      const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/store";
      return NextResponse.redirect(new URL(target, request.url));
    }
    return response;
  }

  // 2. Unauthenticated visitors
  // Allow access to public auth pages, seller portal, APIs, and auth callbacks
  if (isAuthPage || isSellerPortal || isApiRoute || isAuthRoute) {
    return response;
  }

  // Any other storefront page requires registration first
  const signupUrl = new URL("/signup", request.url);
  if (pathname !== "/" && pathname !== "/store") {
    signupUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  }
  return NextResponse.redirect(signupUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|txt|xml)$).*)",
  ],
};
