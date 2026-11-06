# Stylist App

A personal-styling website. Clients describe an occasion (for example an Indian wedding sangeet), upload photos of the outfits and accessories they're considering, and get an instant **AI first look** built on the stylist's own sample looks, guides and links. If they don't like it, they can ask the stylist for a **personal review**. Every suggestion can be rated 👍/👎 with a comment.

- **3 free first looks** per client, then **$5/month** membership (Stripe).
- **Private photos.** Each client's photos are visible only to that client. The stylist sees them only when the client asks for a personal review.
- **Stylist studio:** review requests, all feedback (who said what), knowledge base, learnings, members, settings.
- **Learning loop:** each client's own feedback personalises their next looks. The stylist can turn all feedback, anonymised, into style rules used for everyone.

**Stack:** Next.js 15 (App Router) · Supabase (sign-in, Postgres, private storage) · Stripe (subscriptions) · Anthropic Claude API (image + text review) · hosted on Vercel.

---

## Setup (about 45 minutes, one time)

You'll create four free accounts: **Supabase**, **Anthropic**, **Stripe**, **Vercel**. Keep a notes file open to paste keys into. They all go into `.env.local` (for your computer) and Vercel (for the live site). See `.env.example` for the full list.

### 1. Supabase (database, sign-in, photo storage)
1. Go to https://supabase.com → **New project**. Pick a region near you and save the database password.
2. **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, then click **Run**. This creates the tables, the privacy rules, and two storage buckets: `client-photos` (private) and `kb-images` (public).
3. **Project Settings → API**: copy the **Project URL**, the **anon public** key and the **service_role** key.
   The service_role key is secret: never share it or put it in the browser.
4. **Authentication → URL Configuration**:
   - Site URL: your live address (e.g. `https://stylist-app.vercel.app`). Use `http://localhost:3000` while testing.
   - Redirect URLs: add `http://localhost:3000/auth/callback` and `https://YOUR-SITE/auth/callback`.
5. Optional: **Authentication → Providers → Google** to allow "Continue with Google". Email sign-in links work without this.

### 2. Anthropic (the AI)
1. Go to https://console.anthropic.com → **API Keys → Create key**, and copy it.
2. Add a small amount of credit under **Billing**. Each first look costs a few cents.

### 3. Stripe (the $5/month)
1. Go to https://dashboard.stripe.com and stay in **Test mode** at first.
2. **Product catalog → Add product**, e.g. "Styling membership", **Recurring**, **$5.00 / month**. Copy its **Price ID** (`price_…`).
3. **Developers → API keys**: copy the **Secret key** (`sk_test_…`).
4. **Settings → Billing → Customer portal**: click **Activate** so members can cancel or update their card themselves.
5. The webhook is set up after deploying (step 5).

### 4. Run it on your computer (optional but recommended)
```bash
npm install
cp .env.example .env.local     # then fill in the values
npm run dev                    # open http://localhost:3000
```
Set `STYLIST_EMAILS` to your daughter's email. When she signs in with that email, she sees the **Stylist studio** tab.

To test payments locally, install the Stripe CLI and run:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
Put the `whsec_…` value it prints into `STRIPE_WEBHOOK_SECRET`. Test card: `4242 4242 4242 4242`, any future date, any CVC.

### 5. Put it live on Vercel
1. Push this repo to GitHub.
2. Go to https://vercel.com → **Add New → Project**, and import the repo. Vercel detects Next.js automatically.
3. Under **Environment Variables**, add every value from `.env.example`. Set `NEXT_PUBLIC_SITE_URL` to your Vercel address.
4. Click **Deploy**.
5. Back in Stripe, go to **Developers → Webhooks → Add endpoint**:
   - URL: `https://YOUR-SITE/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the **Signing secret** into Vercel as `STRIPE_WEBHOOK_SECRET`, then redeploy.
6. Update the Supabase **Site URL** and **Redirect URLs** (step 1.4) to the live address.

### 6. First steps for the stylist
1. Sign in with the stylist email → **Stylist studio → Settings**: set the app name, her name and the tagline.
2. **Knowledge base**: add 10–20 of her best looks (photo, title, tags like `sangeet, pastel, evening`, styling notes), a few guides (e.g. "Mehendi dos and don'ts") and favourite shopping links.
3. Sign in with a different email as a test client and try the whole flow: first look → feedback → ask for review → reply in studio → third free look → subscribe with a test card.
4. When everything works, switch Stripe to **Live mode**: create the live product and price, and use the live keys and webhook in Vercel.

---

## How privacy is enforced

| Data | Who can read it | How |
|---|---|---|
| Client photos | The client; the stylist only after a review request | Private bucket, no public URLs. The server checks access and issues 1-hour signed links. |
| Looks, requests, feedback | The client (own rows only); the stylist | Postgres Row Level Security: clients can read only rows with their own `user_id`. All writes go through server routes. |
| Stylist looks and guides | Everyone | Public `kb-images` bucket and a readable `kb_items` table. |
| Learnings shared across clients | Used by the AI for everyone | Built from feedback text only, with no names or photos. The stylist reviews them before saving. |

Free-look limits and membership status are checked **on the server** (`/api/review`), so they can't be bypassed from the browser.

## Project layout
```
supabase/schema.sql          tables, privacy rules, storage buckets
src/lib/ai.ts                prompt + Claude call (first look, learnings)
src/lib/auth.ts              current user, stylist check, settings, plan
src/app/style/               client: get styled (upload, result, paywall)
src/app/my-looks/            client: history + stylist replies
src/app/account/             client: membership status, manage billing
src/app/studio/              stylist: requests, feedback, KB, learnings, members, settings
src/app/api/review           AI first look (quota check, private upload, Claude)
src/app/api/feedback         thumbs up/down + comment
src/app/api/request-review   ask the stylist personally
src/app/api/stripe/*         checkout, billing portal, webhook
specs/001-stylist-app/       Spec Kit spec, plan and tasks
```

## Ideas for next versions
- Email the stylist when a new review request arrives, and email the client when she replies (e.g. with Resend).
- Let clients delete their own looks and photos from "My looks".
- Add the price to settings automatically from Stripe.
- Turn the website into an installable phone app (PWA).
