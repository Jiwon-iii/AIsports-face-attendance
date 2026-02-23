import Link from "next/link";

export default function Home() {
  const menus = [
    {
      href: "/register",
      title: "Face Register",
      description: "사용자 얼굴 정보 등록과 동의 절차를 진행합니다.",
    },
    {
      href: "/checkin",
      title: "Check-in",
      description: "현장 카메라 인증으로 출석 처리를 수행합니다.",
    },
    {
      href: "/admin",
      title: "Admin Dashboard",
      description: "출석 로그와 실패 건을 확인하고 수동 처리합니다.",
    },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-14 md:px-10">
      <section className="panel mb-8 p-8 md:p-10">
        <p className="mb-3 inline-flex rounded-full bg-sky-100 px-3 py-1 font-mono text-xs font-semibold tracking-wide text-sky-900">
          AIsport Face Attendance
        </p>
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          안면인식 출석 시스템 시작점
        </h1>
        <p className="max-w-2xl text-slate-700">
          실무 확장과 포트폴리오를 동시에 고려한 구조로, 등록부터 체크인 운영까지
          연결되는 기본 흐름을 바로 테스트할 수 있습니다.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {menus.map((menu) => (
          <Link
            key={menu.href}
            href={menu.href}
            className="panel group p-6 transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl"
          >
            <p className="mb-2 text-sm font-mono text-sky-800">Route</p>
            <h2 className="mb-3 text-2xl font-semibold text-slate-900">
              {menu.title}
            </h2>
            <p className="text-sm text-slate-700">{menu.description}</p>
            <p className="mt-6 text-sm font-semibold text-sky-800 group-hover:text-sky-900">
              Open {menu.href}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}
