import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // 1. Authenticated users (Customer, Seller, Admin)
  if (user) {
    // If already logged in, redirect away from signup/login pages to storefront or intended destination
    if (pathname === "/signup" || pathname === "/login") {
      const next = request.nextUrl.searchParams.get("next");
      const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/store";
      return NextResponse.redirect(new URL(target, request.url));
    }
    return response;
  }

  // 2. Unauthenticated visitors
  // Strict checkout auth protection: Must login or signup when proceeding to purchase
  if (pathname === "/checkout" || pathname.startsWith("/checkout/")) {
    const nextDestination = `${pathname}${request.nextUrl.search}`;
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", nextDestination);
    return NextResponse.redirect(loginUrl);
  }

  // Protected customer account
  if (pathname === "/account" || pathname.startsWith("/account/")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", "/account");
    return NextResponse.redirect(loginUrl);
  }

  // Protected executive admin portal
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname !== "/admin/login") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // ALL other pages are completely public for browsing:
  // - Root (/)
  // - Storefront (/store)
  // - Product detail pages (/products/[slug])
  // - Informational pages (/shipping, /returns, /contact, /about, /terms, /privacy, /orders)
  // - Seller portal (/seller)
  // - APIs (/api/...)
  // - Auth endpoints (/auth/...)
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|txt|xml)$).*)",
  ],
};
