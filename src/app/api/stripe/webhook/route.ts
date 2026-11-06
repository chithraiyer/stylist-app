import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdmin } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Stripe calls this when a membership starts, renews, changes or is cancelled.
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig || "", process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e: any) {
    return NextResponse.json({ error: `Webhook signature failed: ${e?.message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.subscription) {
        const sub = await stripe().subscriptions.retrieve(String(s.subscription));
        await saveSubscription(sub, s.client_reference_id || undefined);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await saveSubscription(event.data.object as Stripe.Subscription);
      break;
  }
  return NextResponse.json({ received: true });
}

async function saveSubscription(sub: Stripe.Subscription, userId?: string) {
  const admin = createAdmin();
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  // Newer Stripe API versions keep the period end on the subscription item.
  const anySub = sub as any;
  const end: number | undefined = anySub.current_period_end ?? anySub.items?.data?.[0]?.current_period_end;
  const update = {
    subscription_status: sub.status === "incomplete_expired" ? "canceled" : sub.status,
    stripe_customer_id: customer,
    current_period_end: end ? new Date(end * 1000).toISOString() : null,
  };
  const id = userId || sub.metadata?.user_id;
  if (id) await admin.from("profiles").update(update).eq("id", id);
  else await admin.from("profiles").update(update).eq("stripe_customer_id", customer);
}
