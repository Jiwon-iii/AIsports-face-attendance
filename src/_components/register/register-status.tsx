import { StateBanner } from "@/_components/common/state-banner";
import { RegisterResult } from "@/_hooks/use-register-user";

type Props = {
  isLoading: boolean;
  errorMessage: string | null;
  data: RegisterResult | null;
  showEmpty: boolean;
};

export function RegisterStatus({ isLoading, errorMessage, data, showEmpty }: Props) {
  return (
    <>
      {isLoading && <StateBanner tone="loading" message="등록 처리 중입니다..." />}

      {errorMessage && <StateBanner tone="error" message={errorMessage} />}

      {data && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          등록 완료: {data.name} ({data.userId}) / 동의 버전 {data.consentVersion}
        </div>
      )}

      {showEmpty && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          등록 정보를 입력하고 동의를 체크해 주세요.
        </div>
      )}
    </>
  );
}
