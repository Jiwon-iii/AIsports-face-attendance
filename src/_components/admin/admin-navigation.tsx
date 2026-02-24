"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/_handlers/http-handler";

export function AdminNavigation() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetchJson<{ ok: boolean }>("/api/admin/logout", {
      method: "POST",
    });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <Link
        href="/admin/participants"
        className="inline-flex min-h-11 items-center rounded-full bg-slate-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        참가자 관리
      </Link>
      <button
        type="button"
        onClick={() => void handleLogout()}
        className="inline-flex min-h-11 items-center rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
      >
        로그아웃
      </button>
    </div>
  );
}
