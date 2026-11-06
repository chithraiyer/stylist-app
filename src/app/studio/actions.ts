"use server";
import { revalidatePath } from "next/cache";
import { requireStylist } from "@/lib/auth";
import { createAdmin } from "@/lib/supabase/server";
import { distillLearnings, summarize } from "@/lib/ai";

const str = (f: FormData, k: string, n = 5000) => String(f.get(k) ?? "").trim().slice(0, n);

export async function replyRequest(f: FormData) {
  await requireStylist();
  const id = str(f, "id", 64);
  const reply = str(f, "reply");
  if (!id || !reply) return;
  await createAdmin()
    .from("review_requests")
    .update({ status: "answered", reply, replied_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/studio");
}

export async function addKb(f: FormData) {
  await requireStylist();
  const admin = createAdmin();
  const type = str(f, "type", 10) as "look" | "guide" | "link";
  if (!["look", "guide", "link"].includes(type)) return;
  const row: Record<string, unknown> = {
    type,
    title: str(f, "title", 200),
    tags: str(f, "tags", 300) || null,
    notes: str(f, "notes", 2000) || null,
    body: str(f, "body", 20000) || null,
    url: str(f, "url", 1000) || null,
  };
  if (type === "link") row.region = str(f, "region", 60) || "Anywhere";
  if (!row.title) return;
  if (type === "link" && !/^https?:\/\//.test(String(row.url || ""))) return;
  const img = f.get("image");
  if (type === "look") {
    if (!(img instanceof File) || !img.size) return;
    const ext = img.type === "image/png" ? "png" : img.type === "image/webp" ? "webp" : "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await admin.storage
      .from("kb-images")
      .upload(path, Buffer.from(await img.arrayBuffer()), { contentType: img.type || "image/jpeg" });
    if (error) throw new Error("Could not upload the photo.");
    row.image_path = path;
  }
  await admin.from("kb_items").insert(row);
  revalidatePath("/studio/kb");
  revalidatePath("/");
}

export async function updateGuide(f: FormData) {
  await requireStylist();
  const id = str(f, "id", 64);
  const title = str(f, "title", 200);
  const body = str(f, "body", 20000);
  if (!id || !title || !body) return;
  await createAdmin().from("kb_items").update({ title, body }).eq("id", id).eq("type", "guide");
  revalidatePath("/studio/kb");
}

export async function deleteKb(f: FormData) {
  await requireStylist();
  const admin = createAdmin();
  const id = str(f, "id", 64);
  const { data } = await admin.from("kb_items").select("image_path").eq("id", id).maybeSingle();
  if (data?.image_path) await admin.storage.from("kb-images").remove([data.image_path]);
  await admin.from("kb_items").delete().eq("id", id);
  revalidatePath("/studio/kb");
  revalidatePath("/");
}

export async function saveLearnings(f: FormData) {
  await requireStylist();
  await createAdmin().from("settings").update({ learnings: str(f, "learnings", 10000), updated_at: new Date().toISOString() }).eq("id", 1);
  revalidatePath("/studio/learnings");
}

/** Summarise all client feedback (without names or photos) into style rules. Returns a draft; nothing is saved. */
export async function draftLearnings(existing: string): Promise<{ text?: string; error?: string }> {
  await requireStylist();
  const { data } = await createAdmin()
    .from("feedback")
    .select("kind,rating,comment,sessions(form,result)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (!data?.length) return { error: "No feedback yet." };
  const lines = data.map((f: any) => {
    const s = Array.isArray(f.sessions) ? f.sessions[0] : f.sessions;
    return `${f.rating === "up" ? "LIKED" : "DISLIKED"} | ${f.kind} | ${s?.form?.event || ""} | comment: ${f.comment || "-"} | suggestion: ${summarize(s?.result).slice(0, 200)}`;
  });
  try {
    return { text: await distillLearnings(existing, lines) };
  } catch {
    return { error: "The AI is busy. Try again in a minute." };
  }
}

export async function saveSettings(f: FormData) {
  await requireStylist();
  await createAdmin()
    .from("settings")
    .update({
      brand_name: str(f, "brand_name", 80) || "Your Stylist",
      stylist_name: str(f, "stylist_name", 80) || "your stylist",
      tagline: str(f, "tagline", 160),
      free_looks: Math.max(0, Math.min(50, parseInt(str(f, "free_looks", 4)) || 3)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  revalidatePath("/", "layout");
}
