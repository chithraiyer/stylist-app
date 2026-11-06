import { createAdmin } from "@/lib/supabase/server";
import { kbImageUrl } from "@/lib/photos";
import { addKb, deleteKb } from "../actions";
import SubmitButton from "@/components/SubmitButton";

export default async function KnowledgeBase() {
  const { data } = await createAdmin().from("kb_items").select("*").order("created_at", { ascending: false });
  const items = (data || []) as any[];
  const looks = items.filter((k) => k.type === "look");
  const guides = items.filter((k) => k.type === "guide");
  const links = items.filter((k) => k.type === "link");
  const Remove = ({ id }: { id: string }) => (
    <form action={deleteKb}>
      <input type="hidden" name="id" value={id} />
      <button className="btn ghost small">Remove</button>
    </form>
  );

  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        Everything here shapes the AI first look. Clients see your looks as examples and get your links. They never see
        each other's photos.
      </p>
      <div className="grid3">
        <form className="card" action={addKb}>
          <h3>Add a look</h3>
          <input type="hidden" name="type" value="look" />
          <div className="field" style={{ marginTop: 10 }}>
            <label>Photo</label>
            <input type="file" name="image" accept="image/jpeg,image/png,image/webp" required />
          </div>
          <div className="field"><label>Title</label><input type="text" name="title" required placeholder="e.g. Pastel lehenga with polki jewelry" /></div>
          <div className="field"><label>Tags</label><input type="text" name="tags" placeholder="e.g. sangeet, evening, pastel, guest" /></div>
          <div className="field"><label>Styling notes</label><textarea name="notes" placeholder="Why this works, what to pair, what to avoid…" /></div>
          <SubmitButton>Add look</SubmitButton>
        </form>
        <form className="card" action={addKb}>
          <h3>Add a guide</h3>
          <input type="hidden" name="type" value="guide" />
          <div className="field" style={{ marginTop: 10 }}><label>Title</label><input type="text" name="title" required placeholder="e.g. Mehendi dos and don'ts" /></div>
          <div className="field"><label>Content</label><textarea name="body" required style={{ minHeight: 160 }} placeholder="Your style rules, tips and knowledge…" /></div>
          <SubmitButton>Add guide</SubmitButton>
        </form>
        <form className="card" action={addKb}>
          <h3>Add a link</h3>
          <input type="hidden" name="type" value="link" />
          <div className="field" style={{ marginTop: 10 }}><label>Title</label><input type="text" name="title" required placeholder="e.g. Where to buy statement jhumkas" /></div>
          <div className="field"><label>URL</label><input type="url" name="url" required placeholder="https://…" /></div>
          <div className="field"><label>Note</label><input type="text" name="notes" placeholder="Short note (optional)" /></div>
          <SubmitButton>Add link</SubmitButton>
        </form>
      </div>

      <h3 style={{ margin: "24px 0 10px" }}>Your looks ({looks.length})</h3>
      {looks.length ? (
        <div className="looks">
          {looks.map((l) => (
            <div className="look" key={l.id}>
              <img src={kbImageUrl(l.image_path)} alt={l.title} loading="lazy" />
              <div className="meta">
                <b>{l.title}</b>
                <span className="muted">{l.tags}</span>
                {l.notes && <div className="small" style={{ margin: "4px 0" }}>{l.notes}</div>}
                <Remove id={l.id} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="muted small">No looks yet. Add your best combinations above.</div>
      )}

      <h3 style={{ margin: "24px 0 10px" }}>Guides ({guides.length})</h3>
      <div className="list">
        {!guides.length && <div className="muted small">No guides yet.</div>}
        {guides.map((g) => (
          <div className="item" key={g.id}>
            <div className="top"><b>{g.title}</b><Remove id={g.id} /></div>
            <div className="small muted" style={{ whiteSpace: "pre-wrap" }}>{(g.body || "").slice(0, 500)}</div>
          </div>
        ))}
      </div>

      <h3 style={{ margin: "24px 0 10px" }}>Links ({links.length})</h3>
      <div className="list">
        {!links.length && <div className="muted small">No links yet.</div>}
        {links.map((l) => (
          <div className="item" key={l.id}>
            <div className="top"><a href={l.url} target="_blank" rel="noopener noreferrer">{l.title}</a><Remove id={l.id} /></div>
            {l.notes && <div className="small muted">{l.notes}</div>}
          </div>
        ))}
      </div>
    </>
  );
}
