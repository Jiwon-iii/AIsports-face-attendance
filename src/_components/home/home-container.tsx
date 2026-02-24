import Link from "next/link";

export function HomeContainer() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-6xl flex-col px-4 py-8 sm:px-6 md:px-8">
      <section className="panel p-6 sm:p-8 md:p-10">
        <p className="mb-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 font-mono text-xs font-semibold text-emerald-900">
          키오스크 모드
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
          안면인식 출석 시스템
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700 sm:text-base">
          사용자 화면은 전면 카메라 기반 출석만 제공하고, 등록/관리는 관리자 화면에서 처리합니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/checkin"
            className="inline-flex min-h-11 items-center rounded-full bg-sky-700 px-5 text-sm font-semibold text-white transition hover:bg-sky-800"
          >
            체크인 시작
          </Link>
          <Link
            href="/admin/login"
            className="inline-flex min-h-11 items-center rounded-full bg-slate-700 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            관리자 로그인
          </Link>
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        <Link href="/checkin" className="panel p-5 transition hover:-translate-y-0.5 hover:border-sky-300">
          <p className="text-xs font-mono text-sky-700">사용자</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">체크인</h2>
          <p className="mt-2 text-sm text-slate-700">전면 카메라 촬영 후 자동 얼굴 인식으로 출석 처리합니다.</p>
        </Link>
        <Link
          href="/admin/participants"
          className="panel p-5 transition hover:-translate-y-0.5 hover:border-sky-300"
        >
          <p className="text-xs font-mono text-sky-700">관리자</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">참가자 관리</h2>
          <p className="mt-2 text-sm text-slate-700">정보 등록(사진 포함)과 조회를 한 화면에서 처리합니다.</p>
        </Link>
        <Link href="/admin" className="panel p-5 transition hover:-translate-y-0.5 hover:border-sky-300">
          <p className="text-xs font-mono text-sky-700">관리자</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">출석 대시보드</h2>
          <p className="mt-2 text-sm text-slate-700">실시간 출석 로그와 상태를 조회합니다.</p>
        </Link>
      </section>
    </main>
  );
}
