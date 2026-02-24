import { Suspense } from "react";
import { AdminLoginClient } from "@/_components/admin/admin-login-client";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-md flex-col px-4 py-8 sm:px-6 md:px-8">
      <Suspense
        fallback={
          <section className="panel p-6 text-sm text-slate-600 sm:p-8">
            로그인 화면을 불러오는 중입니다...
          </section>
        }
      >
        <AdminLoginClient />
      </Suspense>
    </main>
  );
}
