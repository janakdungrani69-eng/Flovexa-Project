import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "Public seller upgrade is closed. Flovexa Seller Central is strictly private." },
    { status: 403 }
  );
}
