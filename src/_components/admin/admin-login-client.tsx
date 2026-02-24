"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchJson } from "@/_handlers/http-handler";
import { StateBanner } from "@/_components/common/state-banner";

function resolveNextPath(nextPath: string | null) {
  if (!nextPath) {
    return "/admin";
  }
  if (!nextPath.startsWith("/admin")) {
    return "/admin";
  }
  return nextPath;
}

export function AdminLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = useMemo(() => resolveNextPath(searchParams.get("next")), [searchParams]);

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await fetchJson<{ ok: boolean }>("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id.trim(), password }),
      });
      router.push(redirectPath);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "로그인에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="panel p-6 sm:p-8">
      <h1 className="mt-2 text-2xl font-bold text-slate-900">관리자 로그인</h1>
      <p className="mt-2 text-sm text-slate-700">관리자 전용 페이지입니다. 계정으로 로그인해 주세요.</p>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-800">아이디</span>
          <input
            className="ui-input"
            value={id}
            onChange={(event) => setId(event.target.value)}
            autoComplete="username"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-slate-800">비밀번호</span>
          <input
            type="password"
            className="ui-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && <StateBanner tone="error" message={error} />}

        <button
          type="submit"
          disabled={isLoading || !id.trim() || !password}
          className="ui-btn-primary inline-flex items-center justify-center"
        >
          {isLoading ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </section>
  );
}
