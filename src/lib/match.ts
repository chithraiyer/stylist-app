import type { KbItem, StyleForm, StyleResult } from "./ai";

/**
 * Keyword matching between what the client asked for and the stylist's knowledge base.
 * Used to (1) put the most relevant looks first in the AI prompt, (2) pick looks/links in
 * test mode, and (3) fill in when the AI returns no (or invalid) picks.
 */

const STOP = new Set(
  "a an and are as at be but by for from has have i im in into is it its me my of on or our so that the their them this to too was we were what when with you your want need help like love wear wearing outfit look looks something some any can should would will just very really also other".split(" ")
);

// Spelling variants and close synonyms, mapped to one canonical word.
const SYN: Record<string, string> = {
  mehndi: "mehendi", henna: "mehendi", sari: "saree", sarees: "saree", lehnga: "lehenga", lengha: "lehenga",
  ghagra: "lehenga", chaniya: "lehenga", choli: "lehenga", salwar: "suit", kameez: "suit", anarkali: "suit",
  kurti: "kurta", sherwani: "kurta", jhumka: "jhumkas", jhumki: "jhumkas", earring: "earrings",
  night: "evening", nighttime: "evening", day: "daytime", morning: "daytime", afternoon: "daytime",
  outdoor: "outdoors", outside: "outdoors", indoor: "indoors", inside: "indoors",
  beach: "coastal", coast: "coastal", ocean: "coastal", seaside: "coastal",
  trip: "travel", roadtrip: "travel", vacation: "travel", holiday: "travel",
  party: "cocktail", reception: "reception", diwali: "festival", eid: "festival", navratri: "festival", garba: "festival",
  pastels: "pastel", heels: "heel", shoes: "shoe", sandals: "shoe", juttis: "shoe", mojari: "shoe",
  bags: "bag", tote: "bag", clutch: "bag", potli: "bag", crossbody: "bag",
  jewellery: "jewelry", jewelery: "jewelry", necklaces: "necklace", bangles: "bangle",
};

export function tokens(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => SYN[w] || (w.endsWith("s") && !w.endsWith("ss") && SYN[w.slice(0, -1)]) || w)
    .map((w) => (w.length > 4 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
}

function clientWords(form: StyleForm, labels: string[]) {
  const strong = new Set(tokens([form.event, form.when].join(" "))); // occasion + setting matter most
  const all = new Set([
    ...strong,
    ...tokens([form.role, form.ask, form.budget, (form.looking_for || []).join(" "), labels.join(" ")].join(" ")),
  ]);
  return { strong, all };
}

/** Relevance score of one look for this request (0 = no overlap). */
export function scoreLook(look: KbItem, form: StyleForm, labels: string[]) {
  const { strong, all } = clientWords(form, labels);
  const tagWords = new Set(tokens((look.tags || "").replace(/,/g, " ")));
  const titleWords = new Set(tokens(look.title || ""));
  const noteWords = new Set(tokens(look.notes || ""));
  let score = 0;
  for (const w of all) {
    const boost = strong.has(w) ? 2 : 1;
    if (tagWords.has(w)) score += 3 * boost;
    if (titleWords.has(w)) score += 2 * boost;
    if (noteWords.has(w)) score += 1 * boost;
  }
  return score;
}

export function rankLooks(kb: KbItem[], form: StyleForm, labels: string[]) {
  return kb
    .filter((k) => k.type === "look")
    .map((l) => ({ l, s: scoreLook(l, form, labels) }))
    .sort((a, b) => b.s - a.s);
}

export function matchLooks(kb: KbItem[], form: StyleForm, labels: string[], n = 3): string[] {
  const ranked = rankLooks(kb, form, labels).filter((x) => x.s > 0);
  const top = ranked[0]?.s || 0;
  // Only show looks that are a reasonably close match to the best one.
  return ranked
    .filter((x) => x.s >= Math.max(3, top * 0.5))
    .slice(0, n)
    .map((x) => x.l.id);
}

const REGION_ALIASES: Record<string, string[]> = {
  usa: ["usa", "us", "united states", "america", "california", "washington", "seattle", "texas", "new york", "new jersey", "illinois", "chicago", "boston", "atlanta", "san francisco", "bay area", "los angeles", "san jose", "dallas", "houston"],
  "bay area": ["bay area", "san francisco", "san jose", "oakland", "fremont", "sunnyvale", "palo alto", "santa clara", "cupertino", "mountain view"],
  uk: ["uk", "united kingdom", "england", "london", "birmingham", "manchester", "leicester", "scotland", "wales"],
  india: ["india", "chennai", "mumbai", "delhi", "bangalore", "bengaluru", "hyderabad", "kolkata", "pune", "ahmedabad", "jaipur", "kochi", "coimbatore"],
  canada: ["canada", "toronto", "vancouver", "brampton", "mississauga", "calgary", "montreal"],
  uae: ["uae", "dubai", "abu dhabi", "sharjah", "emirates"],
  singapore: ["singapore"],
  australia: ["australia", "sydney", "melbourne", "brisbane", "perth"],
};

export function regionMatches(region: string | null | undefined, location: string | undefined) {
  const r = (region || "anywhere").trim().toLowerCase();
  if (!r || r === "anywhere" || r === "worldwide" || r === "online") return true;
  const loc = ` ${(location || "").toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ")} `;
  if (!loc.trim()) return false;
  const names = REGION_ALIASES[r] || [r];
  return names.some((a) => loc.includes(` ${a} `));
}

export function matchLinks(kb: KbItem[], form: StyleForm, labels: string[], n = 3): string[] {
  const { all } = clientWords(form, labels);
  return kb
    .filter((k) => k.type === "link" && regionMatches(k.region, form.location))
    .map((l) => {
      const words = new Set(tokens([l.title, l.notes].join(" ")));
      let s = 0;
      for (const w of all) if (words.has(w)) s += 1;
      return { l, s };
    })
    .filter((x) => x.s > 0 || (form.need && form.need !== "have"))
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.l.id);
}

/** Keep only real ids the AI picked; if it picked none, fall back to keyword matches. */
export function finalizePicks(result: StyleResult, kb: KbItem[], form: StyleForm, labels: string[]): StyleResult {
  const lookIds = new Set(kb.filter((k) => k.type === "look").map((k) => k.id));
  const linkIds = new Set(kb.filter((k) => k.type === "link").map((k) => k.id));
  let looks = (result.reference_look_ids || []).filter((id) => lookIds.has(id)).slice(0, 3);
  let links = (result.link_ids || []).filter((id) => linkIds.has(id)).slice(0, 4);
  if (!looks.length) looks = matchLooks(kb, form, labels);
  if (!links.length) links = matchLinks(kb, form, labels);
  return { ...result, reference_look_ids: looks, link_ids: links };
}
