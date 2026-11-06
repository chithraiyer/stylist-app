"use client";
import { useState } from "react";
import { draftLearnings, saveLearnings } from "../actions";
import SubmitButton from "@/components/SubmitButton";

export default function LearningsEditor({ initial }: { initial: string }) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function draft() {
    setBusy(true);
    setMsg("");
    const r = await draftLearnings(text);
    setBusy(false);
    if (r.text) { setText(r.text); setMsg("Draft ready. Review it, then save."); }
    else setMsg(r.error || "Could not draft.");
  }
  return (
    <form action={async (f) => { await saveLearnings(f); setMsg("Saved. All future first looks will use these learnings."); }}>
      <div className="field">
        <textarea
          name="learnings"
          style={{ minHeight: 240 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"e.g.\n- Clients prefer lighter jewelry for daytime events\n- Always offer one budget swap"}
        />
      </div>
      <div className="row">
        <button type="button" className="btn gold small" onClick={draft} disabled={busy}>
          {busy ? "Reading feedback…" : "Draft from feedback"}
        </button>
        <SubmitButton>Save learnings</SubmitButton>
        {msg && <span className="small muted">{msg}</span>}
      </div>
    </form>
  );
}
