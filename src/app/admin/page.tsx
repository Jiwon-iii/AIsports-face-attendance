import Link from "next/link";

const sampleLogs = [
  { name: "김민준", status: "SUCCESS", time: "09:12:08" },
  { name: "이서윤", status: "FAILED", time: "09:13:42" },
  { name: "박도윤", status: "MANUAL", time: "09:14:10" },
];

export default function AdminPage() {
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
          인증 성공/실패 로그 확인, 실패 건 재시도, 수동 출석 처리 기능을 이
          페이지에 연결할 예정입니다.
        </p>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[420px] border-collapse text-sm sm:min-w-[560px]">
            <thead className="bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">시간</th>
              </tr>
            </thead>
            <tbody>
              {sampleLogs.map((row) => (
                <tr key={`${row.name}-${row.time}`} className="border-t border-slate-200">
                  <td className="px-4 py-3 text-slate-900">{row.name}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {row.status}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700">{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center rounded-full bg-sky-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
        >
          홈으로 이동
        </Link>
      </div>
    </main>
  );
}
