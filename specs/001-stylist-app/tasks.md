# Tasks: Personal Stylist Website (v1)

## Phase 1 — Setup
- [x] T001 Next.js 15 + TypeScript scaffold, global styles
- [x] T002 Supabase schema, RLS and storage buckets (`supabase/schema.sql`)
- [x] T003 Supabase server, admin and browser clients; session-refresh middleware
- [x] T004 Auth: magic link + Google, callback, sign out

## Phase 2 — US1 AI first look
- [x] T010 `/style` form, photo picker with in-browser resize and labels
- [x] T011 `/api/review`: quota check, private upload, Claude call, save session, count look
- [x] T012 Result card: best pick, per-photo notes, styling sections, sample looks, links

## Phase 3 — US2 Feedback
- [x] T020 Feedback widget (👍/👎 + comment) on first looks and stylist replies
- [x] T021 `/api/feedback` with ownership check and one-per-item rule
- [x] T022 Client's own feedback added to their next prompt

## Phase 4 — US3 Personal review
- [x] T030 "Ask the stylist" modal + `/api/request-review`
- [x] T031 Studio request list with photos (signed URLs) and reply form
- [x] T032 "My looks": history and stylist replies

## Phase 5 — US4 Membership
- [x] T040 Paywall modal after free looks (server-enforced 402)
- [x] T041 Stripe Checkout, Billing Portal, webhook sync
- [x] T042 `/account` page

## Phase 6 — US5/US6 Studio
- [x] T050 Knowledge base: add and remove looks, guides, links
- [x] T051 All feedback table with filters and stats
- [x] T052 Learnings editor with "draft from feedback"
- [x] T053 Members list and settings

## Phase 7 — Polish and next
- [x] T060 Privacy page, README setup guide
- [ ] T061 Test with two client accounts that photos stay private (manual)
- [ ] T062 Email notifications for new requests and replies
- [ ] T063 Client self-service delete of looks and account
- [ ] T064 PWA (installable on phones)

## v1.1 — Shopping help by region
- [x] T070 "What do you need?" choice: style what I have / buy something new / both
- [x] T071 Shopping questions when buying: location (required), online/in-store, what they're looking for
- [x] T072 Prompt + result: "What to buy" and "Where to buy near <location>" (no invented stores, URLs or prices)
- [x] T073 Region tag on the stylist's links (`kb_items.region`); the AI picks only links matching the client's region or "Anywhere"
- [x] T074 Shopping details shown on review requests in the studio
- [ ] T075 Optional: live web search for current products and stores (Anthropic web search tool), behind a setting
