import { NextResponse } from "next/server";
import { getCurrentUser, getProfile, isMember } from "@/lib/auth";
import { createAdmin } from "@/lib/supabase/server";
import { siteUrl, stripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const profile = await getProfile(user.id, user.email);
  if (isMember(profile)) return NextResponse.json({ url: `${siteUrl()}/account` });
  if (!process.env.STRIPE_PRICE_ID) return NextResponse.json({ error: "Payments are not set up yet." }, { status: 500 });

  let customer = profile.stripe_customer_id;
  if (!customer) {
    const c = await stripe().customers.create({ email: user.email || undefined, metadata: { user_id: user.id } });
    customer = c.id;
    await createAdmin().from("profiles").update({ stripe_customer_id: customer }).eq("id", user.id);
  }

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: user.id,
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    success_url: `${siteUrl()}/account?checkout=success`,
    cancel_url: `${siteUrl()}/style`,
  });
  return NextResponse.json({ url: session.url });
}
