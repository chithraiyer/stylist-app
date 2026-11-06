# Feature Specification: Personal Stylist Website (v1)

**Feature branch**: `001-stylist-app` · **Status**: Implemented (v1) · **Created**: 2026-11-06

## Summary
A website where clients get styling advice for an occasion (e.g. an Indian wedding). The AI gives an instant "first look" based on the client's photos and the stylist's own knowledge base. The stylist reviews personally only when the client asks. Clients get 3 free first looks, then pay $5/month.

## User scenarios

### US1 — Client gets an AI first look (P1)
A client signs in, chooses the occasion, role, time and setting, adds an optional budget and question, uploads up to 5 labelled photos, and gets a structured recommendation: best option and why, notes on each option, styling, accessories, footwear and bag, hair and makeup, what to avoid, a shopping list, matching sample looks and links.
- **Given** a signed-in client with free looks left, **when** they submit, **then** they get a first look within about 30 seconds and their free-look count drops by one.
- **Given** a client with no photos and no text, **when** they submit, **then** they're asked to add one.

### US2 — Feedback on every suggestion (P1)
After every AI first look and every stylist reply, the client can give 👍/👎 and an optional comment, once per item.
- Feedback is shown to the stylist with the client's name and email.
- A client's own past feedback is used to personalise their next first looks.
- The stylist can turn all feedback, anonymised, into shared "learnings" used for every client.

### US3 — Ask the stylist personally (P1)
If a client doesn't like the AI's suggestion, they can send the look to the stylist with a message. The stylist sees the photos, the request and the AI's summary, and replies. The client sees the reply in "My looks".

### US4 — Free looks, then membership (P1)
Each client gets `free_looks` (default 3) first looks. After that, a paywall offers membership at $5/month through Stripe Checkout. Members get unlimited looks. Members manage or cancel through the Stripe customer portal. The stylist account is unlimited.

### US5 — Stylist manages the knowledge base (P1)
The stylist adds and removes sample looks (photo, title, tags, notes), guides (title, text) and links (title, URL, note). These shape every AI first look. Sample looks also appear on the home page.

### US6 — Stylist studio (P2)
Review requests (waiting first), all feedback with filters and stats, learnings editor with "draft from feedback", members list with plan and usage, and app settings (app name, stylist name, tagline, free-look count).

## Privacy requirements
- **FR-P1**: A client's photos must never be visible to any other client.
- **FR-P2**: The stylist may see a client's photos only for looks the client sent for personal review.
- **FR-P3**: Client photos are stored in private storage. Access is only through short-lived signed URLs issued by the server after an access check.
- **FR-P4**: Shared learnings must contain no names, personal details or photos.
- **FR-P5**: A privacy page explains storage, AI processing, feedback visibility, payments and deletion.

## Functional requirements
- **FR-1**: Sign-in by email magic link, with optional Google sign-in.
- **FR-2**: Free-look limit and membership are enforced on the server.
- **FR-3**: Photos are resized in the browser before upload: max 1280px, JPEG, ≤5 photos, ≤5 MB each.
- **FR-4**: Stylist accounts are identified by the `STYLIST_EMAILS` environment variable.
- **FR-5**: Stripe webhooks keep `subscription_status` and `current_period_end` in sync.

## Out of scope for v1
Email notifications, native phone apps, multiple stylists with separate client lists, client self-service deletion, chat-style follow-ups.

## Success criteria
- A new client can go from sign-up to first look in under 2 minutes.
- At least 70% thumbs-up on AI first looks after the knowledge base has 15 or more looks.
- No client can reach another client's photos, verified by testing two accounts.
