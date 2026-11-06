import { getSettings, isMember } from "@/lib/auth";
import { createAdmin } from "@/lib/supabase/server";

export default async function Members() {
  const [s, { data }] = await Promise.all([
    getSettings(),
    createAdmin().from("profiles").select("*").order("last_active_at", { ascending: false, nullsFirst: false }).limit(1000),
  ]);
  const rows = (data || []) as any[];
  const members = rows.filter(isMember).length;
  return (
    <>
      <div className="stats">
        <div className="stat"><b>{rows.length}</b><span className="small muted">Clients</span></div>
        <div className="stat"><b>{members}</b><span className="small muted">Paying members</span></div>
        <div className="stat"><b>${members * s.monthly_price_usd}</b><span className="small muted">Monthly revenue (before fees)</span></div>
        <div className="stat"><b>{rows.reduce((a, r) => a + (r.looks_used || 0), 0)}</b><span className="small muted">First looks given</span></div>
      </div>
      <div className="card" style={{ overflow: "auto" }}>
        {!rows.length ? (
          <div className="muted">No clients yet.</div>
        ) : (
          <table>
            <thead><tr><th>Client</th><th>Looks used</th><th>Plan</th><th>Joined</th><th>Last active</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.full_name || r.email}</b>{r.full_name && <div className="small muted">{r.email}</div>}</td>
                  <td>{r.looks_used}</td>
                  <td>{isMember(r) ? <span className="pill sage">Member</span> : <span className="pill grey">{r.subscription_status === "none" ? "Free" : r.subscription_status}</span>}</td>
                  <td className="small muted">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="small muted">{r.last_active_at ? new Date(r.last_active_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
