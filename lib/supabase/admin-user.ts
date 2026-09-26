import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAdminUser() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user || data.user.app_metadata?.role !== "admin") return null;
    return data.user;
  } catch { return null; }
}
