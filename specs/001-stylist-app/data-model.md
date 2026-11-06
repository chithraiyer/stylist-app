# Data Model

| Table | Key fields | Notes |
|---|---|---|
| `profiles` | `id` (= auth user), `email`, `full_name`, `looks_used`, `subscription_status`, `stripe_customer_id`, `current_period_end`, `last_active_at` | Created by a trigger on sign-up |
| `settings` | single row `id=1`: `brand_name`, `stylist_name`, `tagline`, `free_looks`, `monthly_price_usd`, `learnings` | Readable by all |
| `kb_items` | `type` (look, guide or link), `title`, `tags`, `notes`, `body`, `url`, `image_path` | Readable by all; written by the stylist through server actions |
| `sessions` | `user_id`, `form` jsonb, `photo_paths[]`, `photo_labels[]`, `result` jsonb | One AI first look |
| `review_requests` | `user_id`, `session_id` (unique), `message`, `status` (pending or answered), `reply`, `replied_at` | One per session |
| `feedback` | `user_id`, `kind` (ai or stylist), `session_id` or `request_id`, `rating` (up or down), `comment` | Unique per user and item |

**Storage buckets**
- `client-photos`: private, accessed through signed URLs only.
- `kb-images`: public.

**Row Level Security**: SELECT only, on own rows (`auth.uid() = user_id`). There are no INSERT, UPDATE or DELETE policies, so all writes go through the server.
