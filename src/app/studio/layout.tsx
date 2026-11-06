import { requireStylist } from "@/lib/auth";
import StudioNav from "./StudioNav";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await requireStylist();
  return (
    <>
      <h2 style={{ marginBottom: 12 }}>Stylist studio</h2>
      <StudioNav />
      {children}
    </>
  );
}
