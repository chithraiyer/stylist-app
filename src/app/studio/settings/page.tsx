import { getSettings } from "@/lib/auth";
import { saveSettings } from "../actions";
import SubmitButton from "@/components/SubmitButton";

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <form className="card" style={{ maxWidth: 560 }} action={saveSettings}>
      <div className="field"><label>App name</label><input type="text" name="brand_name" defaultValue={s.brand_name} /></div>
      <div className="field"><label>Stylist's name (shown to clients)</label><input type="text" name="stylist_name" defaultValue={s.stylist_name} /></div>
      <div className="field"><label>Tagline</label><input type="text" name="tagline" defaultValue={s.tagline} /></div>
      <div className="field"><label>Free first looks per client</label><input type="number" name="free_looks" min={0} max={50} defaultValue={s.free_looks} /></div>
      <p className="small muted">
        The monthly price (${s.monthly_price_usd}) is set by the Stripe price in STRIPE_PRICE_ID. To change it, create a
        new price in Stripe, update STRIPE_PRICE_ID, and update monthly_price_usd in the settings table.
      </p>
      <SubmitButton>Save settings</SubmitButton>
    </form>
  );
}
