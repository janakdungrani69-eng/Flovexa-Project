import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStoreRole, storeRoleHome } from "@/lib/supabase/roles";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login?error=confirmation", url));
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/login?error=confirmation", url));
    const { data } = await supabase.auth.getUser();
    return NextResponse.redirect(new URL(data.user ? storeRoleHome(getStoreRole(data.user)) : "/login", url));
  } catch {
    return NextResponse.redirect(new URL("/login?error=confirmation", url));
  }
}
