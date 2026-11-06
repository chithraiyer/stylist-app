import Anthropic from "@anthropic-ai/sdk";
import type { Settings } from "./auth";

export type StyleForm = { event: string; role: string; when: string; budget: string; ask: string };

export type StyleResult = {
  first_impression?: string;
  best_option?: { photo_number: number | null; why: string };
  photo_notes?: { photo_number: number; note: string }[];
  outfit_styling?: string[];
  accessories?: string[];
  footwear_and_bag?: string[];
  hair_and_makeup?: string[];
  avoid?: string[];
  shopping_list?: string[];
  reference_look_ids?: string[];
  link_ids?: string[];
  note_for_client?: string;
};

export type KbItem = {
  id: string;
  type: "look" | "guide" | "link";
  title: string;
  tags: string | null;
  notes: string | null;
  body: string | null;
  url: string | null;
  image_path: string | null;
};

export type PastFeedback = { rating: string; comment: string | null; event?: string; summary?: string };

const MODEL = () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

function client() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export function summarize(r: StyleResult | null | undefined) {
  if (!r) return "";
  return [r.first_impression, r.best_option?.why].filter(Boolean).join(" ").slice(0, 400);
}

function parseJSON(text: string): StyleResult | null {
  try {
    return JSON.parse(text);
  } catch {}
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch {}
  }
  return null;
}

export function buildPrompt(opts: {
  settings: Settings;
  form: StyleForm;
  labels: string[];
  kb: KbItem[];
  mine: PastFeedback[];
}) {
  const { settings, form, labels, kb, mine } = opts;
  const looks =
    kb
      .filter((k) => k.type === "look")
      .slice(0, 80)
      .map((l) => `- ${l.id} | ${l.title} | tags: ${l.tags || ""} | ${l.notes || ""}`)
      .join("\n") || "(none yet)";
  let guides = "";
  for (const g of kb.filter((k) => k.type === "guide")) {
    const s = `### ${g.title}\n${(g.body || "").slice(0, 2500)}\n`;
    if ((guides + s).length > 20000) break;
    guides += s;
  }
  const links =
    kb
      .filter((k) => k.type === "link")
      .slice(0, 80)
      .map((l) => `- ${l.id} | ${l.title} | ${l.url} | ${l.notes || ""}`)
      .join("\n") || "(none yet)";
  const photoList = labels.length ? labels.map((l, i) => `Photo ${i + 1}: ${l || "(no label)"}`).join("\n") : "(no photos)";
  const mineTxt = mine.length
    ? mine
        .map(
          (f) =>
            `- ${f.rating === "up" ? "LIKED" : "DISLIKED"}: "${f.comment || ""}" (occasion: ${f.event || ""}; suggestion was: ${(f.summary || "").slice(0, 200)})`
        )
        .join("\n")
    : "(none)";

  return `CLIENT REQUEST
Occasion: ${form.event}
Attending as: ${form.role}
Time & setting: ${form.when}
Budget for new items: ${form.budget || "not given"}
In their words: ${form.ask || "(nothing written)"}

CLIENT PHOTOS (${labels.length}, attached above in this order):
${photoList}

STYLIST'S REFERENCE LOOKS (id | title | tags | notes):
${looks}

STYLIST'S GUIDES:
${guides || "(none yet)"}

STYLIST'S LINKS (id | title | url | note):
${links}

LEARNINGS FROM PAST CLIENT FEEDBACK (anonymised, applies to everyone):
${settings.learnings || "(none yet)"}

THIS CLIENT'S OWN PAST FEEDBACK (adapt to it):
${mineTxt}

Reply with ONLY a JSON object, no prose around it, in this shape:
{"first_impression":"2-3 sentences","best_option":{"photo_number":<int or null>,"why":"..."},"photo_notes":[{"photo_number":1,"note":"short honest note"}],"outfit_styling":["..."],"accessories":["..."],"footwear_and_bag":["..."],"hair_and_makeup":["..."],"avoid":["..."],"shopping_list":["specific items to buy if needed, within budget"],"reference_look_ids":["ids from the reference looks that match, max 3"],"link_ids":["ids from the links that help, max 3"],"note_for_client":"one encouraging line"}
Keep each list to 2-5 short bullet points.`;
}

/** Test mode: no Anthropic key set (or AI_TEST_MODE=true) → return a sample answer without calling the AI. */
export function aiTestMode() {
  return !process.env.ANTHROPIC_API_KEY || process.env.AI_TEST_MODE === "true";
}

function sampleResult(form: StyleForm, labels: string[], kb: KbItem[]): StyleResult {
  const n = labels.length;
  return {
    first_impression: `[TEST MODE: sample answer, not a real AI review] For a ${form.event.toLowerCase()} as a ${form.role.toLowerCase()} (${form.when.toLowerCase()}), you're on the right track. Let's make it polished and comfortable.`,
    best_option: { photo_number: n ? 1 : null, why: n ? `Photo 1${labels[0] ? ` (${labels[0]})` : ""} suits the occasion best: the colour and weight feel right for the setting.` : "Go for a rich jewel tone with light embroidery." },
    photo_notes: labels.map((l, i) => ({ photo_number: i + 1, note: `${l || `Option ${i + 1}`}: sample note for testing.` })),
    outfit_styling: ["Drape the dupatta over one shoulder to show the embroidery", "Keep the silhouette structured and fitted at the waist"],
    accessories: ["Statement earrings, so skip the necklace", "A few thin bangles on one wrist"],
    footwear_and_bag: ["Embellished juttis or block heels for comfort", "A small potli bag in a matching tone"],
    hair_and_makeup: ["Soft waves or a low bun with fresh flowers", "Defined eyes with a neutral lip"],
    avoid: ["Wearing white or ivory head to toe", "Very heavy jewelry with a heavily embroidered outfit"],
    shopping_list: form.budget ? [`Earrings within your budget (${form.budget})`] : ["Statement earrings"],
    reference_look_ids: kb.filter((k) => k.type === "look").slice(0, 2).map((k) => k.id),
    link_ids: kb.filter((k) => k.type === "link").slice(0, 1).map((k) => k.id),
    note_for_client: "You're going to look wonderful!",
  };
}

export async function runFirstLook(opts: {
  settings: Settings;
  form: StyleForm;
  labels: string[];
  images: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" }[];
  kb: KbItem[];
  mine: PastFeedback[];
}): Promise<StyleResult> {
  if (aiTestMode()) return sampleResult(opts.form, opts.labels, opts.kb);
  const system = `You are the AI "first look" assistant for ${opts.settings.stylist_name}, a personal fashion stylist. A client wants help dressing well for an occasion.
Use the stylist's knowledge base as your main guide to taste and rules. Where it doesn't cover something, use broadly accepted styling knowledge, including cultural dress norms for Indian weddings and other occasions.
Be warm, specific and practical. Talk about the clothes and accessories; never criticise the person's body. Recommend from the client's own options first, then suggest small additions.`;

  const content: Anthropic.ContentBlockParam[] = [
    ...opts.images.map(
      (img): Anthropic.ContentBlockParam => ({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.base64 },
      })
    ),
    { type: "text", text: buildPrompt(opts) },
  ];

  const msg = await client().messages.create({
    model: MODEL(),
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content }],
  });
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const parsed = parseJSON(text);
  if (!parsed) throw new Error("The assistant replied in an unexpected format. Please try again.");
  return parsed;
}

export async function distillLearnings(existing: string, lines: string[]) {
  if (aiTestMode())
    return `${existing ? existing + "\n" : ""}- [TEST MODE] Sample rule drafted from ${lines.length} feedback item(s). Add an Anthropic key for real learnings.`;
  const msg = await client().messages.create({
    model: MODEL(),
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: `You help a fashion stylist improve her AI assistant. Below is anonymised client feedback on suggestions. Write 5-12 short, practical styling rules the assistant should follow from now on, as "- " bullets. Base them only on patterns in the feedback. Keep useful existing rules and merge duplicates. Never include names or personal details.

EXISTING RULES:
${existing || "(none)"}

FEEDBACK:
${lines.join("\n")}

Reply with only the bullet list.`,
      },
    ],
  });
  return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
}
