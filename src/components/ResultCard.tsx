"use client";
import { useState } from "react";
import type { StyleForm, StyleResult } from "@/lib/ai";
import Feedback, { type GivenFeedback } from "./Feedback";

export type LookRef = { id: string; title: string; tags: string | null; image_url: string };
export type LinkRef = { id: string; title: string; url: string | null; notes: string | null };
export type SessionView = {
  id: string;
  form: StyleForm;
  result: StyleResult;
  created_at: string;
  photo_labels: string[];
};

function Bullets({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="section">
      <h4>{title}</h4>
      <ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}

export default function ResultCard({
  session,
  photoUrls,
  looks,
  links,
  stylistName,
  feedback,
  canAsk,
}: {
  session: SessionView;
  photoUrls: string[];
  looks: LookRef[];
  links: LinkRef[];
  stylistName: string;
  feedback: GivenFeedback;
  canAsk: boolean;
}) {
  const r = session.result || {};
  const bi = (r.best_option?.photo_number ?? 0) - 1;
  const [asking, setAsking] = useState(false);
  const [asked, setAsked] = useState(!canAsk);

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <span className="pill">AI first look</span>
          <h3 style={{ marginTop: 6 }}>{session.form.event}</h3>
        </div>
        <span className="small muted">{new Date(session.created_at).toLocaleString()}</span>
      </div>
      {r.first_impression && <p>{r.first_impression}</p>}
      {r.best_option?.why && (
        <div className="best">
          {photoUrls[bi] && <img src={photoUrls[bi]} alt="Best option" />}
          <div>
            <div className="section" style={{ marginTop: 0 }}>
              <h4 style={{ color: "var(--maroon)" }}>
                {bi >= 0 ? `Best pick: photo ${bi + 1}${session.photo_labels[bi] ? " · " + session.photo_labels[bi] : ""}` : "Best direction"}
              </h4>
            </div>
            {r.best_option.why}
          </div>
        </div>
      )}
      {!!r.photo_notes?.length && (
        <div className="section">
          <h4>Your options</h4>
          <ul>
            {r.photo_notes.map((p, i) => (
              <li key={i}>
                <b>Photo {p.photo_number}: </b>
                {p.note}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid2">
        <Bullets title="How to style it" items={r.outfit_styling} />
        <Bullets title="Accessories" items={r.accessories} />
        <Bullets title="Footwear & bag" items={r.footwear_and_bag} />
        <Bullets title="Hair & makeup" items={r.hair_and_makeup} />
        <Bullets title="Avoid" items={r.avoid} />
        <Bullets title="Shopping list" items={r.shopping_list} />
      </div>
      {!!looks.length && (
        <div className="section">
          <h4>Similar looks by {stylistName}</h4>
          <div className="looks">
            {looks.map((l) => (
              <div className="look" key={l.id}>
                {l.image_url && <img src={l.image_url} alt={l.title} loading="lazy" />}
                <div className="meta">
                  <b>{l.title}</b>
                  <span className="muted">{l.tags}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!!links.length && (
        <div className="section">
          <h4>Helpful links</h4>
          <ul>
            {links.map((l) => (
              <li key={l.id}>
                <a href={l.url || "#"} target="_blank" rel="noopener noreferrer">{l.title}</a>
                {l.notes ? ` · ${l.notes}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {r.note_for_client && <p className="muted" style={{ fontStyle: "italic", marginTop: 14 }}>{r.note_for_client}</p>}
      <Feedback kind="ai" refId={session.id} given={feedback} />
      {asked ? (
        canAsk ? <div className="okbox" style={{ marginTop: 12 }}>Sent to {stylistName}. You'll find her reply in “My looks”.</div> : null
      ) : (
        <div className="row" style={{ marginTop: 12 }}>
          <span className="small muted">Not quite right?</span>
          <button className="btn ghost small" onClick={() => setAsking(true)}>
            Ask {stylistName} to review it personally
          </button>
        </div>
      )}
      {asking && <AskModal sessionId={session.id} stylistName={stylistName} onClose={() => setAsking(false)} onSent={() => { setAsking(false); setAsked(true); }} />}
    </div>
  );
}

function AskModal({ sessionId, stylistName, onClose, onSent }: { sessionId: string; stylistName: string; onClose: () => void; onSent: () => void }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function send() {
    setBusy(true);
    const r = await fetch("/api/request-review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, message: msg }),
    });
    setBusy(false);
    if (r.ok || r.status === 409) onSent();
    else setErr((await r.json().catch(() => ({}))).error || "Could not send.");
  }
  return (
    <div className="modalbg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>Ask {stylistName} personally</h3>
        <p className="small muted">
          She'll see your photos, the occasion and the AI's suggestion, and reply with her own advice. Your photos are
          shared only with her.
        </p>
        <div className="field">
          <textarea placeholder="What didn't work for you? Anything else she should know?" value={msg} onChange={(e) => setMsg(e.target.value)} />
        </div>
        {err && <div className="errbox" style={{ marginBottom: 10 }}>{err}</div>}
        <div className="row">
          <button className="btn" disabled={busy} onClick={send}>{busy ? "Sending…" : "Send request"}</button>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
