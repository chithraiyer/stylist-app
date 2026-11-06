"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/style";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: callback() } });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  }

  async function google() {
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback() } });
    if (error) setErr(error.message);
  }

  return (
    <div className="center card">
      <h2 style={{ marginBottom: 6 }}>Sign in</h2>
      <p className="muted small">New here? Signing in creates your free account.</p>
      {sent ? (
        <div className="okbox">Check your email for a sign-in link. You can close this tab.</div>
      ) : (
        <form onSubmit={sendLink}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Sending…" : "Email me a sign-in link"}
          </button>
          <div style={{ textAlign: "center", margin: "12px 0" }} className="muted small">or</div>
          <button type="button" className="btn ghost" style={{ width: "100%" }} onClick={google}>
            Continue with Google
          </button>
        </form>
      )}
      {err && <div className="errbox" style={{ marginTop: 12 }}>{err}</div>}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
