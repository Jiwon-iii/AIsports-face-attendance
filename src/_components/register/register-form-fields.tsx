type Props = {
  userId: string;
  name: string;
  email: string;
  isConsentChecked: boolean;
  onChangeUserId: (value: string) => void;
  onChangeName: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onChangeConsent: (checked: boolean) => void;
};

export function RegisterFormFields({
  userId,
  name,
  email,
  isConsentChecked,
  onChangeUserId,
  onChangeName,
  onChangeEmail,
  onChangeConsent,
}: Props) {
  return (
    <>
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-800">참가자 번호</span>
        <input
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none ring-sky-200 transition focus:ring"
          value={userId}
          onChange={(event) => onChangeUserId(event.target.value)}
          placeholder="예: 10001234"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-800">이름</span>
        <input
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none ring-sky-200 transition focus:ring"
          value={name}
          onChange={(event) => onChangeName(event.target.value)}
          placeholder="이름 입력"
          autoComplete="name"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-800">이메일 (선택)</span>
        <input
          type="email"
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none ring-sky-200 transition focus:ring"
          value={email}
          onChange={(event) => onChangeEmail(event.target.value)}
          placeholder="name@example.com"
          autoComplete="email"
        />
      </label>

      <label className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
        <input
          type="checkbox"
          checked={isConsentChecked}
          onChange={(event) => onChangeConsent(event.target.checked)}
        />
        <span className="text-sm text-slate-800">안면 데이터 처리 동의</span>
      </label>
    </>
  );
}
