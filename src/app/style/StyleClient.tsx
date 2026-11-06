"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import ResultCard, { type LinkRef, type LookRef, type SessionView } from "@/components/ResultCard";

type Photo = { blob: Blob; preview: string; label: string };

const EVENTS = [
  "Indian wedding – Mehendi",
  "Indian wedding – Haldi",
  "Indian wedding – Sangeet",
  "Indian wedding – Wedding ceremony",
  "Indian wedding – Reception",
  "Festival (Diwali, Eid, Navratri, etc.)",
  "Cocktail / party",
  "Work / interview",
  "Date night",
  "Casual / brunch",
  "Other",
];

/** Shrink a photo in the browser before upload (faster, cheaper, more private). */
async function shrink(file: File, max = 1280): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Could not read this image. Try a JPG or PNG."));
      i.src = url;
    });
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * s);
    c.height = Math.round(img.naturalHeight * s);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Could not process image."))), "image/jpeg", 0.85));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function StyleClient({
  stylistName,
  freeLooks,
  price,
  left: initialLeft,
}: {
  stylistName: string;
  freeLooks: number;
  price: number;
  left: number | null; // null = unlimited
}) {
  const [left, setLeft] = useState(initialLeft);
  const [form, setForm] = useState({ event: EVENTS[3], role: "Guest", when: "Evening, indoors", budget: "", ask: "" });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [paywall, setPaywall] = useState(false);
  const [over, setOver] = useState(false);
  const [out, setOut] = useState<{ session: SessionView; photoUrls: string[]; looks: LookRef[]; links: LinkRef[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...photos];
    for (const f of Array.from(list)) {
      if (next.length >= 5) { setErr("Up to 5 photos per request."); break; }
      if (!f.type.startsWith("image/")) continue;
      try {
        const blob = await shrink(f);
        next.push({ blob, preview: URL.createObjectURL(blob), label: "" });
      } catch (e: any) { setErr(e.message); }
    }
    setPhotos(next);
  }

  async function submit() {
    setErr("");
    if (!photos.length && !form.ask.trim()) { setErr("Add at least one photo or describe what you need."); return; }
    if (left === 0) { setPaywall(true); return; }
    setBusy(true);
    setOut(null);
    const fd = new FormData();
    fd.set("form", JSON.stringify(form));
    fd.set("labels", JSON.stringify(photos.map((p) => p.label)));
    photos.forEach((p, i) => fd.append("photos", p.blob, `photo-${i + 1}.jpg`));
    try {
      const r = await fetch("/api/review", { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (r.status === 402) { setLeft(0); setPaywall(true); return; }
      if (!r.ok) { setErr(data.error || "Something went wrong. Please try again."); return; }
      setOut(data);
      if (left !== null) setLeft(Math.max(0, left - 1));
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {
      setErr("Network problem. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="hero" style={{ marginBottom: 16 }}>
        <div>
          <h2>Get styled</h2>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Describe the occasion and add photos of what you're considering. Only you can see your photos.{" "}
            <Link href="/privacy">How photos are handled</Link>
          </p>
        </div>
        <div>
          {left === null ? (
            <div className="okbox">Unlimited first looks and personal reviews.</div>
          ) : left > 0 ? (
            <div className="small muted">You have {left} of {freeLooks} free looks left. After that, membership is ${price}/month.</div>
          ) : (
            <div className="note">
              You've used your {freeLooks} free looks.{" "}
              <button className="btn small" style={{ marginLeft: 6 }} onClick={() => setPaywall(true)}>See membership</button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="grid2">
          <div className="field">
            <label>Occasion</label>
            <select value={form.event} onChange={set("event")}>{EVENTS.map((e) => <option key={e}>{e}</option>)}</select>
          </div>
          <div className="field">
            <label>You are attending as</label>
            <select value={form.role} onChange={set("role")}>
              {["Guest", "Close family", "Bride / groom", "Bridesmaid / groomsman", "Host"].map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Time &amp; setting</label>
            <select value={form.when} onChange={set("when")}>
              {["Daytime, outdoors", "Daytime, indoors", "Evening, indoors", "Evening, outdoors"].map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Budget for anything new (optional)</label>
            <input type="text" placeholder="e.g. under $150 for accessories" value={form.budget} onChange={set("budget")} />
          </div>
        </div>
        <div className="field">
          <label>What do you need help with?</label>
          <textarea
            placeholder="e.g. I'm choosing between these two lehengas for my cousin's wedding. I prefer comfort, love pastels, and don't want heavy jewelry. What should I pair with it?"
            value={form.ask}
            onChange={set("ask")}
          />
        </div>
        <div className="field">
          <label>Your options (up to 5 photos: outfits, jewelry, shoes, bags)</label>
          <div
            className={`drop ${over ? "over" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); }}
          >
            <b>Tap to add photos</b> or drop them here
            <div className="small muted">Add a short label under each photo, e.g. "pink lehenga".</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <div className="thumbs">
            {photos.map((p, i) => (
              <div className="thumb" key={p.preview}>
                <img src={p.preview} alt={`Option ${i + 1}`} />
                <span className="num">{i + 1}</span>
                <button className="x" title="Remove" onClick={() => setPhotos(photos.filter((_, j) => j !== i))}>×</button>
                <input
                  type="text"
                  placeholder='Label, e.g. "gold jhumkas"'
                  value={p.label}
                  onChange={(e) => setPhotos(photos.map((q, j) => (j === i ? { ...q, label: e.target.value } : q)))}
                />
              </div>
            ))}
          </div>
        </div>
        {err && <div className="errbox" style={{ marginBottom: 12 }}>{err}</div>}
        <button className="btn" onClick={submit} disabled={busy}>
          {busy ? <><span className="spinner" /> Styling your look… (about 20 seconds)</> : "Get my first look"}
        </button>
      </div>

      <div ref={resultRef} style={{ marginTop: 22 }}>
        {out && (
          <ResultCard
            session={out.session}
            photoUrls={out.photoUrls}
            looks={out.looks}
            links={out.links}
            stylistName={stylistName}
            feedback={null}
            canAsk
          />
        )}
      </div>

      {paywall && <Paywall freeLooks={freeLooks} price={price} stylistName={stylistName} onClose={() => setPaywall(false)} />}
    </>
  );
}

export function Paywall({ freeLooks, price, stylistName, onClose }: { freeLooks: number; price: number; stylistName: string; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function subscribe() {
    setBusy(true);
    const r = await fetch("/api/stripe/checkout", { method: "POST" });
    const d = await r.json().catch(() => ({}));
    if (d.url) window.location.href = d.url;
    else { setBusy(false); setErr(d.error || "Could not start checkout."); }
  }
  return (
    <div className="modalbg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <span className="pill amber">Membership</span>
        <h3 style={{ margin: "8px 0" }}>Keep styling with {stylistName}</h3>
        <p className="muted">You've used your {freeLooks} free first looks. Membership gives you:</p>
        <ul>
          <li>Unlimited AI first looks</li>
          <li>Personal reviews from {stylistName}</li>
          <li>Your full history of looks</li>
        </ul>
        <div className="row" style={{ margin: "14px 0" }}>
          <span className="price">${price}</span>
          <span className="muted">per month · cancel anytime</span>
        </div>
        {err && <div className="errbox" style={{ marginBottom: 10 }}>{err}</div>}
        <div className="row">
          <button className="btn" disabled={busy} onClick={subscribe}>{busy ? "Opening secure checkout…" : "Become a member"}</button>
          <button className="btn ghost" onClick={onClose}>Not now</button>
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>Payments are handled securely by Stripe. We never see your card details.</p>
      </div>
    </div>
  );
}
