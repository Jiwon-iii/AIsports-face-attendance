import Link from "next/link";

export default function CheckinPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-10 md:px-8 lg:px-10 lg:py-12">
      <div className="panel p-5 sm:p-8 md:p-10">
        <p className="mb-3 font-mono text-[11px] font-semibold tracking-wide text-sky-900 sm:text-xs">
          /checkin
        </p>
        <h1 className="mb-4 text-2xl font-bold text-slate-900 sm:text-3xl md:text-4xl">
          안면인식 출석 체크인
        </h1>
        <p className="mb-6 max-w-2xl text-sm leading-6 text-slate-700 sm:mb-8 sm:text-base">
          현장 카메라 미리보기, liveness 검사, 매칭 점수 확인 후 출석 저장 플로우를
          이 페이지에서 처리합니다.
        </p>

        <div className="rounded-2xl border border-dashed border-sky-300 bg-sky-50 p-5 sm:p-8">
          <div className="mx-auto flex aspect-[4/5] w-full max-w-md items-center justify-center rounded-xl border border-sky-200 bg-white text-center sm:aspect-video sm:max-w-none">
            <p className="text-sm font-semibold text-sky-900">
              Camera Preview Placeholder
            </p>
          </div>
          <p className="mt-4 text-xs text-slate-600 sm:text-sm">
            모바일/태블릿/노트북 공통 테스트를 위해 카메라 프리뷰 비율을 반응형으로
            조정합니다.
          </p>
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
