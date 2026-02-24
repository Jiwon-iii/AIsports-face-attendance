"use client";

import { useEffect, useState } from "react";
import { AdminNavigation } from "@/_components/admin/admin-navigation";
import { AttendanceLogTable } from "@/_components/admin/attendance-log-table";
import { StateBanner } from "@/_components/common/state-banner";
import { useAttendanceRecords } from "@/_hooks/use-attendance-records";

export function AdminContainer() {
  const [searchUserId, setSearchUserId] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useAttendanceRecords();

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const activeError = localError || error;
  const emptyStateVisible = !isLoading && !activeError && data.length === 0;

  const handleSearch = async () => {
    setLocalError(null);
    await refetch(searchUserId.trim() || undefined);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-10 md:px-8 lg:px-10 lg:py-12">
      <div className="panel p-5 sm:p-8 md:p-10">
        <p className="mb-3 font-mono text-[11px] font-semibold tracking-wide text-sky-900 sm:text-xs">
          /admin
        </p>
        <h1 className="mb-4 text-2xl font-bold text-slate-900 sm:text-3xl md:text-4xl">
          출석 운영 대시보드
        </h1>
        <p className="mb-6 max-w-2xl text-sm leading-6 text-slate-700 sm:mb-8 sm:text-base">
          출석 로그를 조회하고 사용자 ID 기준으로 필터할 수 있습니다.
        </p>

        <div className="mb-4 flex flex-wrap gap-3">
          <input
            className="min-h-11 min-w-56 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none ring-sky-200 transition focus:ring"
            value={searchUserId}
            onChange={(event) => setSearchUserId(event.target.value)}
            placeholder="사용자 ID 필터 (선택)"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={isLoading}
            className="inline-flex min-h-11 items-center rounded-full bg-sky-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            조회
          </button>
        </div>

        {isLoading && <StateBanner tone="loading" message="출석 로그를 불러오는 중입니다..." />}
        {activeError && <StateBanner tone="error" message={activeError} />}

        {emptyStateVisible ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            조회된 출석 로그가 없습니다.
          </div>
        ) : (
          <AttendanceLogTable rows={data} />
        )}

        <AdminNavigation />
      </div>
    </main>
  );
}
