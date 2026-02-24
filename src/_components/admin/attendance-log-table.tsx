import type { AttendanceRecordItem } from "@/_hooks/use-attendance-records";

type Props = {
  rows: AttendanceRecordItem[];
};

export function AttendanceLogTable({ rows }: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[620px] border-collapse text-sm">
        <thead className="bg-slate-50 text-left text-slate-700">
          <tr>
            <th className="px-4 py-3">사용자 ID</th>
            <th className="px-4 py-3">구분</th>
            <th className="px-4 py-3">상태</th>
            <th className="px-4 py-3">시간</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-200">
              <td className="px-4 py-3 text-slate-900">{row.userId}</td>
              <td className="px-4 py-3 text-slate-700">{row.checkType}</td>
              <td className="px-4 py-3 font-semibold text-slate-800">{row.status}</td>
              <td className="px-4 py-3 font-mono text-slate-700">
                {new Date(row.capturedAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
