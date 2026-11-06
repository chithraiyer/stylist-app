import { getProfile, getSettings, isMember, isStylistEmail, requireUser } from "@/lib/auth";
import AccountActions from "./AccountActions";

export const dynamic = "force-dynamic";

export default async function Account({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const user = await requireUser("/account");
  const [settings, profile, sp] = await Promise.all([getSettings(), getProfile(user.id, user.email), searchParams]);
  const member = isMember(profile);
  const stylist = isStylistEmail(user.email);
  return (
    <div className="card" style={{ maxWidth: 620 }}>
      <h2 style={{ marginBottom: 12 }}>Your account</h2>
      {sp.checkout === "success" && (
        <div className="okbox" style={{ marginBottom: 12 }}>
          Thank you! Your membership is being activated. It can take a few seconds to show here.
        </div>
      )}
      <p><b>Email:</b> {user.email}</p>
      <p><b>Looks used:</b> {profile.looks_used}</p>
      {stylist ? (
        <p><span className="pill sage">Stylist account · unlimited</span></p>
      ) : member ? (
        <>
          <p><span className="pill sage">Member</span> ${settings.monthly_price_usd}/month</p>
          {profile.current_period_end && (
            <p className="small muted">Renews {new Date(profile.current_period_end).toLocaleDateString()}</p>
          )}
          <AccountActions mode="portal" />
        </>
      ) : (
        <>
          <p>
            <span className="pill grey">Free</span>{" "}
            {Math.max(0, settings.free_looks - profile.looks_used)} of {settings.free_looks} free looks left
          </p>
          <AccountActions mode="subscribe" price={settings.monthly_price_usd} />
        </>
      )}
    </div>
  );
}
