"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/checkin", label: "체크인" },
  { href: "/admin", label: "관리자" },
  { href: "/admin/participants", label: "참가자 관리" },
  { href: "/admin/login", label: "관리자 인증" },
];

export function TopTabs() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6 md:px-8">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || (tab.href !== "/admin" && pathname.startsWith(`${tab.href}/`));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition ${
                isActive
                  ? "bg-sky-700 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
