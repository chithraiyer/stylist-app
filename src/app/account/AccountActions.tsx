"use client";
import { useState } from "react";

export default function AccountActions({ mode, price }: { mode: "portal" | "subscribe"; price?: number }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function go() {
    setBusy(true);
    const r = await fetch(mode === "portal" ? "/api/stripe/portal" : "/api/stripe/checkout", { method: "POST" });
    const d = await r.json().catch(() => ({}));
    if (d.url) window.location.href = d.url;
    else { setBusy(false); setErr(d.error || "Something went wrong."); }
  }
  return (
    <div>
      <button className="btn" onClick={go} disabled={busy}>
        {busy ? "Opening…" : mode === "portal" ? "Manage or cancel membership" : `Become a member — $${price}/month`}
      </button>
      {err && <div className="errbox" style={{ marginTop: 10 }}>{err}</div>}
    </div>
  );
}
