import Link from "next/link";
import { getCurrentUser, getSettings } from "@/lib/auth";
import { createAdmin } from "@/lib/supabase/server";
import { kbImageUrl } from "@/lib/photos";

export default async function Home() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const { data: looks } = await createAdmin()
    .from("kb_items")
    .select("id,title,tags,image_path")
    .eq("type", "look")
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <>
      <div className="hero">
        <div>
          <h1>
            Tell us the occasion.
            <br />
            Show us your options.
          </h1>
          <p className="muted">
            Planning an outfit for an Indian wedding, a festival or a party? Upload what you're considering and get an
            instant first look built on {settings.stylist_name}'s own looks and style rules. If it doesn't feel right,
            ask {settings.stylist_name} to review it personally.
          </p>
          <div className="steps">
            <div><b>1</b> Describe the event</div>
            <div><b>2</b> Add photos</div>
            <div><b>3</b> Get your look</div>
            <div><b>4</b> Rate it, or ask for a personal review</div>
          </div>
          <div className="row" style={{ marginTop: 18 }}>
            <Link className="btn" href={user ? "/style" : "/login?next=/style"}>
              Get styled — {settings.free_looks} looks free
            </Link>
            <span className="small muted">Then ${settings.monthly_price_usd}/month. Cancel anytime.</span>
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 6 }}>Your photos stay private</h3>
          <p className="small muted" style={{ margin: 0 }}>
            Only you can see the photos you upload. {settings.stylist_name} sees them only if you ask for a personal
            review. Other users never can. <Link href="/privacy">How photos are handled</Link>
          </p>
        </div>
      </div>
      {!!looks?.length && (
        <>
          <h2 style={{ margin: "28px 0 12px" }}>Looks by {settings.stylist_name}</h2>
          <div className="looks">
            {looks.map((l) => (
              <div className="look" key={l.id}>
                {l.image_path && <img src={kbImageUrl(l.image_path)} alt={l.title} loading="lazy" />}
                <div className="meta">
                  <b>{l.title}</b>
                  <span className="muted">{l.tags}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
