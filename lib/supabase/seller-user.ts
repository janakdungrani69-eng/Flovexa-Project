import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getSignedInUser, getStoreRole } from "@/lib/supabase/roles";

export async function getActiveSeller() {
  const user = await getSignedInUser();
  if (!user) return null;
  const role = getStoreRole(user);
  if (role !== "seller" && role !== "admin") return null;

  try {
    const supabase = createAdminSupabase();
    const { data: profile, error } = await supabase
      .from("seller_profiles")
      .select("user_id, store_name, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[getActiveSeller] Notice: Could not read seller profile row:", error);
    }

    if (profile && profile.status === "suspended") return null;

    return {
      user,
      supabase,
      profile: profile ?? {
        user_id: user.id,
        store_name: (user.user_metadata?.store_name as string) || (user.email ? user.email.split("@")[0] : "FLOVEXA"),
        status: "active",
      },
    };
  } catch (err) {
    console.error("[getActiveSeller] Handled server error:", err);
    return null;
  }
}
