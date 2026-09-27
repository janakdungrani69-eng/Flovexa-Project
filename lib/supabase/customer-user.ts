import "server-only";
import { getSignedInUser, getStoreRole } from "@/lib/supabase/roles";

export async function getCustomerUser() {
  const user = await getSignedInUser();
  return user && getStoreRole(user) === "customer" ? user : null;
}
