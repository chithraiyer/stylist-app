import { NextResponse } from "next/server";
import { getCurrentUser, getProfile, getSettings, isMember, isStylistEmail } from "@/lib/auth";
import { createAdmin } from "@/lib/supabase/server";
import { runFirstLook, summarize, type KbItem, type PastFeedback, type StyleForm } from "@/lib/ai";
import { kbImageUrl, signPhotos } from "@/lib/photos";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PHOTOS = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type ImgType = (typeof TYPES)[number];

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const [settings, profile] = await Promise.all([getSettings(), getProfile(user.id, user.email)]);
  const stylist = isStylistEmail(user.email);
  if (!stylist && !isMember(profile) && profile.looks_used >= settings.free_looks) {
    return NextResponse.json({ paywall: true, error: "You've used your free looks." }, { status: 402 });
  }

  const fd = await req.formData();
  let form: StyleForm;
  let labels: string[];
  try {
    form = JSON.parse(String(fd.get("form") || "{}"));
    labels = JSON.parse(String(fd.get("labels") || "[]"));
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const clean = (s: unknown, n: number) => String(s ?? "").slice(0, n);
  form = {
    event: clean(form.event, 120),
    role: clean(form.role, 80),
    when: clean(form.when, 80),
    budget: clean(form.budget, 120),
    ask: clean(form.ask, 2000),
  };
  const files = fd.getAll("photos").filter((f): f is File => f instanceof File);
  if (files.length > MAX_PHOTOS) return NextResponse.json({ error: `Up to ${MAX_PHOTOS} photos.` }, { status: 400 });
  if (!files.length && !form.ask) return NextResponse.json({ error: "Add a photo or describe what you need." }, { status: 400 });
  for (const f of files) {
    if (!TYPES.includes(f.type as ImgType)) return NextResponse.json({ error: "Photos must be JPG, PNG or WebP." }, { status: 400 });
    if (f.size > MAX_BYTES) return NextResponse.json({ error: "Each photo must be under 5 MB." }, { status: 400 });
  }
  labels = files.map((_, i) => clean(labels[i], 80));

  const admin = createAdmin();
  const sessionId = crypto.randomUUID();

  // 1. Save photos privately: client-photos/<user>/<session>/<n>
  const images: { base64: string; mediaType: ImgType }[] = [];
  const paths: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const buf = Buffer.from(await f.arrayBuffer());
    const ext = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/${sessionId}/${i + 1}.${ext}`;
    const { error } = await admin.storage.from("client-photos").upload(path, buf, { contentType: f.type, upsert: false });
    if (error) {
      await cleanup(paths);
      return NextResponse.json({ error: "Could not save your photos. Please try again." }, { status: 500 });
    }
    paths.push(path);
    images.push({ base64: buf.toString("base64"), mediaType: f.type as ImgType });
  }

  // 2. Context for the AI: knowledge base, shared learnings, this client's own feedback
  const [{ data: kb }, { data: fb }] = await Promise.all([
    admin.from("kb_items").select("id,type,title,tags,notes,body,url,image_path").order("created_at", { ascending: false }),
    admin
      .from("feedback")
      .select("rating,comment,sessions(form,result)")
      .eq("user_id", user.id)
      .eq("kind", "ai")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const mine: PastFeedback[] = (fb || []).map((f: any) => {
    const s = Array.isArray(f.sessions) ? f.sessions[0] : f.sessions;
    return { rating: f.rating, comment: f.comment, event: s?.form?.event, summary: summarize(s?.result) };
  });

  // 3. Ask Claude
  let result;
  try {
    result = await runFirstLook({ settings, form, labels, images, kb: (kb || []) as KbItem[], mine });
  } catch (e: any) {
    await cleanup(paths);
    console.error("AI error", e?.message);
    return NextResponse.json({ error: "The stylist assistant is busy. Please try again in a minute." }, { status: 502 });
  }

  // 4. Save the session and count the look
  const { error: insErr } = await admin.from("sessions").insert({
    id: sessionId,
    user_id: user.id,
    form,
    photo_paths: paths,
    photo_labels: labels,
    result,
  });
  if (insErr) {
    await cleanup(paths);
    return NextResponse.json({ error: "Could not save your look." }, { status: 500 });
  }
  await admin
    .from("profiles")
    .update({ looks_used: profile.looks_used + 1, last_active_at: new Date().toISOString() })
    .eq("id", user.id);

  const kbList = (kb || []) as KbItem[];
  return NextResponse.json({
    session: { id: sessionId, form, result, created_at: new Date().toISOString(), photo_labels: labels },
    photoUrls: await signPhotos(paths),
    looks: kbList
      .filter((k) => k.type === "look" && result.reference_look_ids?.includes(k.id))
      .map((k) => ({ id: k.id, title: k.title, tags: k.tags, image_url: kbImageUrl(k.image_path) })),
    links: kbList
      .filter((k) => k.type === "link" && result.link_ids?.includes(k.id))
      .map((k) => ({ id: k.id, title: k.title, url: k.url, notes: k.notes })),
  });
}

async function cleanup(paths: string[]) {
  if (paths.length) await createAdmin().storage.from("client-photos").remove(paths);
}
