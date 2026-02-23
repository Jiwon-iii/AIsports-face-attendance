import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-12 md:px-10">
      <div className="panel p-8 md:p-10">
        <p className="mb-3 font-mono text-xs font-semibold tracking-wide text-sky-900">
          /register
        </p>
        <h1 className="mb-4 text-3xl font-bold text-slate-900 md:text-4xl">
          사용자 얼굴 등록
        </h1>
        <p className="mb-8 max-w-2xl text-slate-700">
          이 페이지에서 사용자 기본 정보 입력, 동의 획득, 얼굴 샘플 촬영(3장)을
          진행합니다.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {["기본 정보", "동의 처리", "얼굴 샘플 캡처"].map((item) => (
            <div key={item} className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800">{item}</p>
            </div>
          ))}
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
