"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/studio", label: "Review requests" },
  { href: "/studio/feedback", label: "All feedback" },
  { href: "/studio/kb", label: "Knowledge base" },
  { href: "/studio/learnings", label: "Learnings" },
  { href: "/studio/members", label: "Members" },
  { href: "/studio/settings", label: "Settings" },
];

export default function StudioNav() {
  const path = usePathname();
  return (
    <div className="subnav">
      {ITEMS.map((i) => (
        <Link key={i.href} href={i.href} className={path === i.href ? "on" : ""}>
          {i.label}
        </Link>
      ))}
    </div>
  );
}
