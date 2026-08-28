"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href,
  match = [],
  children,
}: {
  href: string;
  match?: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activo = pathname === href || match.some((m) => pathname.startsWith(m));
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={
        activo
          ? "rounded-lg bg-ink text-white px-3 py-1.5 text-sm font-semibold"
          : "rounded-lg px-3 py-1.5 text-sm font-semibold text-ink/60 hover:text-ink hover:bg-ink/5"
      }
    >
      {children}
    </Link>
  );
}
