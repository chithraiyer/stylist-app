# Implementation Plan: Personal Stylist Website (v1)

**Spec**: [spec.md](./spec.md)

## Technical context
- **Language/runtime**: TypeScript, Node 20+, Next.js 15 App Router (server components, route handlers, server actions)
- **Auth, database, storage**: Supabase (Postgres with Row Level Security, Storage)
- **AI**: Anthropic Claude Messages API with image input; model set by `ANTHROPIC_MODEL`, default `claude-sonnet-5-5`
- **Payments**: Stripe Checkout (subscription mode), Billing Portal, webhooks
- **Hosting**: Vercel
- **Styling**: one global stylesheet (`src/app/globals.css`), no UI framework

## Architecture decisions
1. **All writes go through the server.** The browser never writes to the database or storage directly. Route handlers and server actions check the signed-in user, then use the Supabase service-role client. RLS lets clients *read* only their own rows. This keeps quota and privacy rules in one place.
2. **Private photo bucket with signed URLs.** `client-photos/<user_id>/<session_id>/<n>.jpg`. The bucket has no storage policies, so it can't be reached from the browser. The server signs URLs for the owner, or for the stylist only on requested sessions.
3. **Stylist role from an environment variable** (`STYLIST_EMAILS`) rather than a database flag. It's simple, and it can't be changed by tampering with data.
4. **Structured JSON output from Claude.** The prompt includes the knowledge base (looks, guides, links), shared learnings and the client's last 10 feedback items. The response is parsed into `StyleResult`.
5. **Learning loop.** It is personal (the client's own feedback goes into their prompt) and global (the stylist-approved learnings text, drafted by Claude from anonymised feedback).

## Data model
See [data-model.md](./data-model.md) and `supabase/schema.sql`.

## Interfaces
| Route | Method | Purpose |
|---|---|---|
| `/api/review` | POST multipart (`form`, `labels`, `photos[]`) | Quota check → private upload → Claude → save session → `{session, photoUrls, looks, links}`; `402` when the paywall applies |
| `/api/feedback` | POST `{kind, refId, rating, comment}` | One rating per look or review; `409` if already rated |
| `/api/request-review` | POST `{sessionId, message}` | Creates a personal review request |
| `/api/stripe/checkout` | POST | Creates or reuses a Stripe customer → Checkout URL |
| `/api/stripe/portal` | POST | Billing portal URL |
| `/api/stripe/webhook` | POST | Syncs subscription status |
| Studio server actions | — | `replyRequest`, `addKb`, `deleteKb`, `saveLearnings`, `draftLearnings`, `saveSettings` |
