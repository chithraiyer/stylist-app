import { getSettings, requireUser } from "@/lib/auth";
import { createAdmin } from "@/lib/supabase/server";
import { kbImageUrl, signPhotos } from "@/lib/photos";
import ResultCard from "@/components/ResultCard";
import Feedback from "@/components/Feedback";
import type { KbItem } from "@/lib/ai";

export const dynamic = "force-dynamic";

export default async function MyLooks() {
  const user = await requireUser("/my-looks");
  const admin = createAdmin();
  const [settings, { data: sessions }, { data: requests }, { data: feedback }, { data: kb }] = await Promise.all([
    getSettings(),
    admin.from("sessions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    admin.from("review_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    admin.from("feedback").select("kind,session_id,request_id,rating,comment").eq("user_id", user.id),
    admin.from("kb_items").select("id,type,title,tags,notes,url,image_path"),
  ]);
  const kbList = (kb || []) as KbItem[];
  const fbFor = (kind: string, id: string) => {
    const f = (feedback || []).find((x) => x.kind === kind && (kind === "ai" ? x.session_id : x.request_id) === id);
    return f ? { rating: f.rating, comment: f.comment } : null;
  };
  const sessionById = new Map((sessions || []).map((s) => [s.id, s]));
  const requested = new Set((requests || []).map((r) => r.session_id));
  const signed = await Promise.all((sessions || []).map((s) => signPhotos(s.photo_paths || [])));
  const urlsFor = new Map((sessions || []).map((s, i) => [s.id, signed[i]]));

  return (
    <>
      <h2 style={{ marginBottom: 6 }}>My looks</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Your first looks and personal reviews from {settings.stylist_name}. Only you can see this page.
      </p>

      <h3 style={{ margin: "18px 0 10px" }}>Personal reviews</h3>
      <div className="list">
        {!requests?.length && <div className="muted small">No personal review requests yet.</div>}
        {(requests || []).map((r) => {
          const s = sessionById.get(r.session_id);
          return (
            <div className="item" key={r.id}>
              <div className="top">
                <b>{s?.form?.event}</b>
                {r.status === "answered" ? <span className="pill sage">Answered</span> : <span className="pill amber">Waiting for reply</span>}
              </div>
              <div className="mini">{(urlsFor.get(r.session_id) || []).map((u, i) => <img key={i} src={u} alt="" />)}</div>
              {r.message && <p className="small muted">You asked: {r.message}</p>}
              {r.status === "answered" && (
                <>
                  <div className="section">
                    <h4>{settings.stylist_name}'s advice</h4>
                    <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{r.reply}</p>
                  </div>
                  <Feedback kind="stylist" refId={r.id} given={fbFor("stylist", r.id)} />
                </>
              )}
            </div>
          );
        })}
      </div>

      <h3 style={{ margin: "24px 0 10px" }}>First looks</h3>
      <div className="list">
        {!sessions?.length && <div className="muted small">No looks yet. Start on “Get styled”.</div>}
        {(sessions || []).map((s) => (
          <details className="item" key={s.id}>
            <summary style={{ cursor: "pointer" }}>
              <b>{s.form?.event}</b> <span className="small muted">· {new Date(s.created_at).toLocaleDateString()}</span>
              <div className="mini">{(urlsFor.get(s.id) || []).map((u, i) => <img key={i} src={u} alt="" />)}</div>
            </summary>
            <div style={{ marginTop: 12 }}>
              <ResultCard
                session={{ id: s.id, form: s.form, result: s.result || {}, created_at: s.created_at, photo_labels: s.photo_labels || [] }}
                photoUrls={urlsFor.get(s.id) || []}
                looks={kbList
                  .filter((k) => k.type === "look" && s.result?.reference_look_ids?.includes(k.id))
                  .map((k) => ({ id: k.id, title: k.title, tags: k.tags, image_url: kbImageUrl(k.image_path) }))}
                links={kbList
                  .filter((k) => k.type === "link" && s.result?.link_ids?.includes(k.id))
                  .map((k) => ({ id: k.id, title: k.title, url: k.url, notes: k.notes }))}
                stylistName={settings.stylist_name}
                feedback={fbFor("ai", s.id)}
                canAsk={!requested.has(s.id)}
              />
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
