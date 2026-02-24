type Props = {
  userId: string;
  checkType: "IN" | "OUT";
  livenessScore: string;
  deviceId: string;
  isSubmitting: boolean;
  onChangeUserId: (value: string) => void;
  onChangeCheckType: (value: "IN" | "OUT") => void;
  onChangeLivenessScore: (value: string) => void;
  onChangeDeviceId: (value: string) => void;
  onVerify: () => void;
  onManualSubmit: () => void;
};

export function CheckinForm({
  userId,
  checkType,
  livenessScore,
  deviceId,
  isSubmitting,
  onChangeUserId,
  onChangeCheckType,
  onChangeLivenessScore,
  onChangeDeviceId,
  onVerify,
  onManualSubmit,
}: Props) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-800">User ID</span>
        <input
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none ring-sky-200 transition focus:ring"
          value={userId}
          onChange={(event) => onChangeUserId(event.target.value)}
          placeholder="e.g. user-0001"
          autoComplete="off"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-800">Device ID (optional)</span>
        <input
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none ring-sky-200 transition focus:ring"
          value={deviceId}
          onChange={(event) => onChangeDeviceId(event.target.value)}
          placeholder="e.g. kiosk-a1"
          autoComplete="off"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-800">Check Type</span>
        <select
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none ring-sky-200 transition focus:ring"
          value={checkType}
          onChange={(event) => onChangeCheckType(event.target.value as "IN" | "OUT")}
        >
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
        </select>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-slate-800">Liveness Score (0-1, optional)</span>
        <input
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none ring-sky-200 transition focus:ring"
          value={livenessScore}
          onChange={(event) => onChangeLivenessScore(event.target.value)}
          placeholder="e.g. 0.88"
          autoComplete="off"
        />
      </label>

      <button
        type="button"
        onClick={onVerify}
        disabled={isSubmitting}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-sky-700 px-5 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        Verify and Check-in
      </button>

      <button
        type="button"
        onClick={onManualSubmit}
        disabled={isSubmitting}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-700 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        Manual Check-in
      </button>
    </div>
  );
}
