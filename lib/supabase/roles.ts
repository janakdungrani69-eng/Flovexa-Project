import "server-only";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StoreRole = "admin" | "seller" | "customer";

export function getStoreRole(user: User): StoreRole {
  const role = user.app_metadata?.role;
  if (role === "owner" || role === "admin") return "admin";
  if (role === "seller") return "seller";
  return "customer";
}

export async function getSignedInUser(): Promise<User | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    return error ? null : data.user;
  } catch { return null; }
}

export function storeRoleHome(role: StoreRole) {
  return role === "admin" ? "/admin" : role === "seller" ? "/seller" : "/account";
}
