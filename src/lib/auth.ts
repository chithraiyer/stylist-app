import { redirect } from "next/navigation";
import { createAdmin, createClient } from "./supabase/server";

export type Settings = {
  brand_name: string;
  stylist_name: string;
  tagline: string;
  free_looks: number;
  monthly_price_usd: number;
  learnings: string;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  looks_used: number;
  subscription_status: string;
  stripe_customer_id: string | null;
  current_period_end: string | null;
};

export function isStylistEmail(email?: string | null) {
  if (!email) return false;
  const list = (process.env.STYLIST_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function getSettings(): Promise<Settings> {
  const admin = createAdmin();
  const { data } = await admin.from("settings").select("*").eq("id", 1).maybeSingle();
  return {
    brand_name: data?.brand_name ?? "Your Stylist",
    stylist_name: data?.stylist_name ?? "your stylist",
    tagline: data?.tagline ?? "Personal styling for every occasion",
    free_looks: data?.free_looks ?? 3,
    monthly_price_usd: Number(data?.monthly_price_usd ?? 5),
    learnings: data?.learnings ?? "",
  };
}

/** Loads the profile, creating it if the signup trigger hasn't run (e.g. users created before the schema). */
export async function getProfile(userId: string, email?: string | null): Promise<Profile> {
  const admin = createAdmin();
  const { data } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (data) return data as Profile;
  await admin.from("profiles").upsert({ id: userId, email: email ?? null }, { onConflict: "id", ignoreDuplicates: true });
  const { data: created, error } = await admin.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return created as Profile;
}

export function isMember(p: Pick<Profile, "subscription_status">) {
  return p.subscription_status === "active" || p.subscription_status === "trialing";
}

export async function requireUser(next = "/") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireStylist() {
  const user = await requireUser("/studio");
  if (!isStylistEmail(user.email)) redirect("/");
  return user;
}
