import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-10 md:px-8 lg:px-10 lg:py-12">
      <div className="panel p-5 sm:p-8 md:p-10">
        <p className="mb-3 font-mono text-[11px] font-semibold tracking-wide text-sky-900 sm:text-xs">
          /register
        </p>
        <h1 className="mb-4 text-2xl font-bold text-slate-900 sm:text-3xl md:text-4xl">
          사용자 얼굴 등록
        </h1>
        <p className="mb-6 max-w-2xl text-sm leading-6 text-slate-700 sm:mb-8 sm:text-base">
          이 페이지에서 사용자 기본 정보 입력, 동의 획득, 얼굴 샘플 촬영(3장)을
          진행합니다.
        </p>

        <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {["기본 정보", "동의 처리", "얼굴 샘플 캡처"].map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 p-4 sm:p-5">
              <p className="text-sm font-semibold text-slate-800 sm:text-base">{item}</p>
            </div>
          ))}
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
