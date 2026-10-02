import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSignedInUser, getStoreRole } from "@/lib/supabase/roles";

export async function getActiveSeller() {
  const user = await getSignedInUser();
  if (!user || getStoreRole(user) !== "seller") return null;

  const supabase = createAdminSupabase();
  const { data: profile, error } = await supabase
    .from("seller_profiles")
    .select("user_id, store_name, status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile || profile.status !== "active") return null;

  return { user, supabase, profile };
}
