import "server-only";
import { getSignedInUser, getStoreRole } from "@/lib/supabase/roles";

export async function getAdminUser() {
  const user = await getSignedInUser();
  return user && getStoreRole(user) === "admin" ? user : null;
}
