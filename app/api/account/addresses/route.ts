import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getCustomerUser } from "@/lib/supabase/customer-user";

export const runtime = "nodejs";
const addressSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(40),
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^[+\d][\d\s()-]{7,18}$/),
  line1: z.string().trim().min(4).max(150),
  line2: z.string().trim().max(150),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().regex(/^\d{6}$/),
  is_default: z.boolean(),
}).strict();

export async function POST(request: Request) {
  const user = await getCustomerUser();
  if (!user) return NextResponse.json({ error: "Sign in to save a delivery address." }, { status: 401 });
  const parsed = addressSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Check the name, phone number and full delivery address." }, { status: 400 });
  const supabase = createAdminSupabase();
  try {
    const { id, ...value } = parsed.data;
    if (id) {
      const { data: ownedAddress, error: ownershipError } = await supabase.from("customer_addresses").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
      if (ownershipError || !ownedAddress) return NextResponse.json({ error: "Saved address not found." }, { status: 404 });
    }
    const { count, error: countError } = await supabase.from("customer_addresses").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    if (countError) throw countError;
    const isDefault = value.is_default || (!id && count === 0);
    const write = id
      ? supabase.from("customer_addresses").update({ ...value, is_default: isDefault }).eq("id", id).eq("user_id", user.id)
      : supabase.from("customer_addresses").insert({ ...value, is_default: isDefault, user_id: user.id });
    const { data, error } = await write.select("id, label, full_name, phone, line1, line2, city, state, pincode, is_default").single();
    if (error) throw error;
    if (isDefault) {
      const { error: defaultsError } = await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", user.id).neq("id", data.id);
      if (defaultsError) throw defaultsError;
    }
    return NextResponse.json({ address: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Customer address could not be saved", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not save this address." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCustomerUser();
  if (!user) return NextResponse.json({ error: "Sign in to remove a delivery address." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !z.uuid().safeParse(id).success) return NextResponse.json({ error: "Choose a valid saved address." }, { status: 400 });
  const supabase = createAdminSupabase();
  const { data: address, error: loadError } = await supabase.from("customer_addresses").select("id, is_default").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (loadError || !address) return NextResponse.json({ error: "Saved address not found." }, { status: 404 });
  const { error } = await supabase.from("customer_addresses").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Could not remove this address." }, { status: 503 });
  if (address.is_default) {
    const { data: nextAddress } = await supabase.from("customer_addresses").select("id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (nextAddress) await supabase.from("customer_addresses").update({ is_default: true }).eq("id", nextAddress.id);
  }
  return NextResponse.json({ ok: true });
}
