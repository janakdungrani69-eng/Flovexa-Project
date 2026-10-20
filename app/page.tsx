import { redirect } from "next/navigation";
import { getSignedInUser } from "@/lib/supabase/roles";

export default async function RootHomePage() {
  const user = await getSignedInUser();
  if (!user) {
    redirect("/signup");
  }
  redirect("/store");
}
