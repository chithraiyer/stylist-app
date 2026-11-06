import { createAdmin } from "@/lib/supabase/server";
import { signPhotos } from "@/lib/photos";
import { summarize } from "@/lib/ai";
import { replyRequest } from "./actions";

export default async function Requests() {
  const admin = createAdmin();
  const { data: reqs } = await admin
    .from("review_requests")
    .select("*, sessions(form,result,photo_paths,photo_labels), profiles(email,full_name)")
    .order("status", { ascending: false }) // 'pending' before 'answered'
    .order("created_at", { ascending: false })
    .limit(100);
  const list = (reqs || []) as any[];
  // Photos are only signed here because the client asked for this review.
  const urls = await Promise.all(list.map((r) => signPhotos(r.sessions?.photo_paths || [])));
  const pending = list.filter((r) => r.status === "pending").length;

  return (
    <>
      <p className="muted">{pending} waiting · {list.length - pending} answered</p>
      {!list.length && <div className="card muted">No requests yet. Clients can ask for a personal review after their AI first look.</div>}
      <div className="list">
        {list.map((r, i) => {
          const s = r.sessions || {};
          const f = s.form || {};
          return (
            <div className="item" key={r.id}>
              <div className="top">
                <div>
                  <b>{r.profiles?.full_name || r.profiles?.email || "Client"}</b>{" "}
                  <span className="small muted">{r.profiles?.email}</span>
                </div>
                <span className={r.status === "answered" ? "pill sage" : "pill amber"}>{r.status === "answered" ? "Answered" : "Waiting"}</span>
              </div>
              <div className="small muted">
                {f.event} · {f.role} · {f.when}
                {f.budget ? ` · budget: ${f.budget}` : ""} · {new Date(r.created_at).toLocaleString()}
              </div>
              {f.need && f.need !== "have" && (
                <p className="small">
                  <b>{f.need === "buy" ? "Wants to buy something new" : "Styling + shopping"}</b>
                  {f.location ? ` · ${f.location}` : ""}
                  {f.shop_mode ? ` · shops ${String(f.shop_mode).toLowerCase()}` : ""}
                  {f.looking_for?.length ? ` · looking for: ${f.looking_for.join(", ")}` : ""}
                </p>
              )}
              {f.ask && <p className="small"><b>Their question: </b>{f.ask}</p>}
              {r.message && <p className="small"><b>Why they asked you: </b>{r.message}</p>}
              <div className="mini big">
                {urls[i].map((u, j) => (
                  <a key={j} href={u} target="_blank" rel="noopener noreferrer" title={s.photo_labels?.[j] || `Photo ${j + 1}`}>
                    <img src={u} alt={s.photo_labels?.[j] || `Photo ${j + 1}`} />
                  </a>
                ))}
              </div>
              {s.result && <p className="small muted"><b>AI suggested: </b>{summarize(s.result)}</p>}
              <form action={replyRequest} style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={r.id} />
                <div className="field">
                  <textarea name="reply" defaultValue={r.reply || ""} placeholder="Your advice for this client…" required />
                </div>
                <button className="btn small">{r.status === "answered" ? "Update reply" : "Send reply"}</button>
              </form>
            </div>
          );
        })}
      </div>
    </>
  );
}
