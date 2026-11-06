"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavTabs({ signedIn, stylist }: { signedIn: boolean; stylist: boolean }) {
  const path = usePathname();
  const tabs = signedIn
    ? [
        { href: "/style", label: "Get styled" },
        { href: "/my-looks", label: "My looks" },
        { href: "/account", label: "Account" },
        ...(stylist ? [{ href: "/studio", label: "Stylist studio" }] : []),
      ]
    : [
        { href: "/", label: "Home" },
        { href: "/login", label: "Sign in" },
      ];
  return (
    <nav className="tabs">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={path === t.href || (t.href !== "/" && path.startsWith(t.href)) ? "on" : ""}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
