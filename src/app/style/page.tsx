import { getProfile, getSettings, isMember, isStylistEmail, requireUser } from "@/lib/auth";
import StyleClient from "./StyleClient";

export const dynamic = "force-dynamic";

export default async function StylePage() {
  const user = await requireUser("/style");
  const [settings, profile] = await Promise.all([getSettings(), getProfile(user.id, user.email)]);
  const unlimited = isStylistEmail(user.email) || isMember(profile);
  const left = unlimited ? null : Math.max(0, settings.free_looks - profile.looks_used);
  return (
    <StyleClient
      stylistName={settings.stylist_name}
      freeLooks={settings.free_looks}
      price={settings.monthly_price_usd}
      left={left}
    />
  );
}
