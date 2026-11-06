import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdmin } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const sessionId = String(body.sessionId || "");
  const message = String(body.message || "").slice(0, 2000).trim();

  const admin = createAdmin();
  const { data: s } = await admin.from("sessions").select("id").eq("id", sessionId).eq("user_id", user.id).maybeSingle();
  if (!s) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { error } = await admin.from("review_requests").insert({ user_id: user.id, session_id: sessionId, message: message || null });
  if (error?.code === "23505") return NextResponse.json({ error: "You already asked for a review of this look." }, { status: 409 });
  if (error) return NextResponse.json({ error: "Could not send your request." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
