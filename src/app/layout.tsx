import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser, getProfile, getSettings, isMember, isStylistEmail } from "@/lib/auth";
import NavTabs from "@/components/NavTabs";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings().catch(() => null);
  return {
    title: s ? `${s.brand_name} — personal styling` : "Personal styling",
    description: s?.tagline || "Get styled for any occasion",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const stylist = isStylistEmail(user?.email);
  let pill: { text: string; cls: string } | null = null;
  if (user && !stylist) {
    const p = await getProfile(user.id, user.email);
    if (isMember(p)) pill = { text: "Member · unlimited", cls: "pill sage" };
    else {
      const left = Math.max(0, settings.free_looks - p.looks_used);
      pill = left
        ? { text: `${left} free look${left === 1 ? "" : "s"} left`, cls: "pill" }
        : { text: "Free looks used", cls: "pill amber" };
    }
  }

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="top">
          <div className="wrap bar">
            <Link href="/" className="brand">
              <b>{settings.brand_name}</b>
              <span>{settings.tagline}</span>
            </Link>
            {pill && <span className={pill.cls}>{pill.text}</span>}
            <NavTabs signedIn={!!user} stylist={stylist} />
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer>
          <div className="wrap row" style={{ justifyContent: "space-between" }}>
            <span>© {new Date().getFullYear()} {settings.brand_name}</span>
            <span className="row">
              <Link href="/privacy">Privacy &amp; photos</Link>
              {user && (
                <form action="/auth/signout" method="post">
                  <button className="linkbtn">Sign out</button>
                </form>
              )}
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
