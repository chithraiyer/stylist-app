import { NextResponse } from "next/server";
import { getCurrentUser, getProfile } from "@/lib/auth";
import { siteUrl, stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const profile = await getProfile(user.id, user.email);
  if (!profile.stripe_customer_id) return NextResponse.json({ error: "No membership found." }, { status: 400 });
  const portal = await stripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${siteUrl()}/account`,
  });
  return NextResponse.json({ url: portal.url });
}
