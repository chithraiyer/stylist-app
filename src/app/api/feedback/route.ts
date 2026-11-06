import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdmin } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const kind = body.kind === "stylist" ? "stylist" : "ai";
  const rating = body.rating === "up" ? "up" : body.rating === "down" ? "down" : null;
  const comment = String(body.comment || "").slice(0, 2000).trim();
  const refId = String(body.refId || "");
  if (!rating || !refId) return NextResponse.json({ error: "Choose thumbs up or down." }, { status: 400 });

  const admin = createAdmin();
  // Only allow feedback on the person's own look / own review.
  const table = kind === "ai" ? "sessions" : "review_requests";
  const { data: owned } = await admin.from(table).select("id").eq("id", refId).eq("user_id", user.id).maybeSingle();
  if (!owned) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const row: Record<string, unknown> = { user_id: user.id, kind, rating, comment: comment || null };
  if (kind === "ai") row.session_id = refId;
  else row.request_id = refId;
  const { error } = await admin.from("feedback").insert(row);
  if (error?.code === "23505") return NextResponse.json({ error: "You already rated this one." }, { status: 409 });
  if (error) return NextResponse.json({ error: "Could not save feedback." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
