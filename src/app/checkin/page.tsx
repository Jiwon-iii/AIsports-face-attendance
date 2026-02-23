import Link from "next/link";

export default function CheckinPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-12 md:px-10">
      <div className="panel p-8 md:p-10">
        <p className="mb-3 font-mono text-xs font-semibold tracking-wide text-sky-900">
          /checkin
        </p>
        <h1 className="mb-4 text-3xl font-bold text-slate-900 md:text-4xl">
          안면인식 출석 체크인
        </h1>
        <p className="mb-8 max-w-2xl text-slate-700">
          현장 카메라 미리보기, liveness 검사, 매칭 점수 확인 후 출석 저장 플로우를
          이 페이지에서 처리합니다.
        </p>

        <div className="rounded-2xl border border-dashed border-sky-300 bg-sky-50 p-10 text-center">
          <p className="text-sm font-semibold text-sky-900">
            Camera Preview Placeholder
          </p>
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
        >
          홈으로 이동
        </Link>
      </div>
    </main>
  );
}
