import "server-only";
import { getSignedInUser } from "@/lib/supabase/roles";

export async function getCustomerUser() {
  const user = await getSignedInUser();
  return user;
}
