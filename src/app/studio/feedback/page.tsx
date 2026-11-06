import Link from "next/link";
import { createAdmin } from "@/lib/supabase/server";
import { summarize } from "@/lib/ai";

export default async function AllFeedback({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const { r } = await searchParams;
  const { data } = await createAdmin()
    .from("feedback")
    .select("*, profiles(email,full_name), sessions(form,result), review_requests(reply,session_id)")
    .order("created_at", { ascending: false })
    .limit(500);
  const all = (data || []) as any[];
  const rows = r === "up" || r === "down" ? all.filter((f) => f.rating === r) : all;
  const up = all.filter((f) => f.rating === "up").length;

  return (
    <>
      <div className="stats">
        <div className="stat"><b>{all.length}</b><span className="small muted">Feedback received</span></div>
        <div className="stat"><b>{all.length ? Math.round((up / all.length) * 100) + "%" : "–"}</b><span className="small muted">Thumbs up</span></div>
        <div className="stat"><b>{all.filter((f) => f.kind === "ai").length}</b><span className="small muted">On AI first looks</span></div>
        <div className="stat"><b>{all.filter((f) => f.kind === "stylist").length}</b><span className="small muted">On your reviews</span></div>
      </div>
      <div className="subnav">
        <Link href="/studio/feedback" className={!r ? "on" : ""}>All</Link>
        <Link href="/studio/feedback?r=down" className={r === "down" ? "on" : ""}>👎 Needs work</Link>
        <Link href="/studio/feedback?r=up" className={r === "up" ? "on" : ""}>👍 Liked</Link>
      </div>
      <div className="card" style={{ overflow: "auto" }}>
        {!rows.length ? (
          <div className="muted">No feedback here yet.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Client</th><th>On</th><th>Rating</th><th>Their comment</th><th>What was suggested</th><th>When</th></tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.id}>
                  <td>
                    <b>{f.profiles?.full_name || f.profiles?.email || "Client"}</b>
                    <div className="small muted">{f.profiles?.email}</div>
                  </td>
                  <td>
                    {f.kind === "ai" ? "AI first look" : "Your review"}
                    <div className="small muted">{f.sessions?.form?.event}</div>
                  </td>
                  <td style={{ fontSize: 18 }}>{f.rating === "up" ? "👍" : "👎"}</td>
                  <td>{f.comment || <span className="muted">—</span>}</td>
                  <td className="small muted">
                    {(f.kind === "ai" ? summarize(f.sessions?.result) : f.review_requests?.reply || "").slice(0, 220)}
                  </td>
                  <td className="small muted">{new Date(f.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
