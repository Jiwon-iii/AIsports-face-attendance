import Link from "next/link";

export function RegisterContainer() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-3xl flex-col px-4 py-8 sm:px-6 md:px-8">
      <section className="panel p-6 sm:p-8">
        <p className="font-mono text-xs font-semibold tracking-wide text-sky-900">/register</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">등록 페이지 이동</h1>
        <p className="mt-2 text-sm text-slate-700">
          참가자 등록은 관리자 로그인 후 `/admin` 페이지에서 진행합니다.
        </p>
        <Link
          href="/admin/login"
          className="mt-5 inline-flex min-h-11 w-fit items-center rounded-full bg-sky-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
        >
          관리자 로그인으로 이동
        </Link>
      </section>
    </main>
  );
}
