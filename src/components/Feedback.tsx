"use client";
import { useState } from "react";

export type GivenFeedback = { rating: string; comment: string | null } | null;

export default function Feedback({
  kind,
  refId,
  given,
}: {
  kind: "ai" | "stylist";
  refId: string;
  given: GivenFeedback;
}) {
  const [done, setDone] = useState<GivenFeedback>(given);
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (done)
    return (
      <div className="fb">
        <div className="okbox">
          Thanks for your feedback {done.rating === "up" ? "👍" : "👎"}
          {done.comment ? ` · "${done.comment}"` : ""}
        </div>
      </div>
    );

  async function send() {
    if (!rating) return;
    setBusy(true);
    setErr("");
    const r = await fetch("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, refId, rating, comment }),
    });
    setBusy(false);
    if (r.ok || r.status === 409) setDone({ rating, comment });
    else setErr((await r.json().catch(() => ({}))).error || "Could not save feedback.");
  }

  return (
    <div className="fb">
      <div className="row">
        <b className="small">{kind === "ai" ? "Was this first look helpful?" : "Was this review helpful?"}</b>
        <button className={`thumbsbtn ${rating === "up" ? "on" : ""}`} onClick={() => setRating("up")} aria-label="Helpful">
          👍
        </button>
        <button className={`thumbsbtn ${rating === "down" ? "on" : ""}`} onClick={() => setRating("down")} aria-label="Not helpful">
          👎
        </button>
      </div>
      <textarea
        style={{ minHeight: 60, marginTop: 10 }}
        placeholder="Tell us what you liked or what to change (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn small" disabled={!rating || busy} onClick={send}>
          {busy ? "Sending…" : "Send feedback"}
        </button>
        {err && <span className="small" style={{ color: "#8A1C14" }}>{err}</span>}
      </div>
    </div>
  );
}
