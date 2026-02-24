import Image from "next/image";
import { FaceProfileItem } from "@/_hooks/use-face-profiles";

type Props = {
  items: FaceProfileItem[];
  isLoading: boolean;
  emptyStateVisible: boolean;
  selectedUserId: string;
  onDelete: (id: string, userId?: string) => Promise<void>;
};

export function RegisteredFaceProfiles({
  items,
  isLoading,
  emptyStateVisible,
  selectedUserId,
  onDelete,
}: Props) {
  return (
    <section className="mt-8 rounded-xl border border-slate-200 p-4 sm:p-5">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">등록된 얼굴 프로필</h2>

      {emptyStateVisible ? (
        <p className="text-sm text-slate-600">조회된 얼굴 프로필이 없습니다.</p>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">사용자 ID: {item.userId}</p>
                  <p className="text-xs text-slate-600">
                    샘플 {item.sampleCount}개 / 마지막 수정 {new Date(item.updatedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void onDelete(item.id, selectedUserId || undefined)}
                  disabled={isLoading}
                  className="inline-flex min-h-9 items-center rounded-full bg-red-600 px-3 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                >
                  삭제
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {item.samples.map((sample, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                  >
                    <Image
                      src={sample.imageDataUrl}
                      alt={`saved-face-${index + 1}`}
                      width={480}
                      height={320}
                      unoptimized
                      className="h-32 w-full object-cover"
                    />
                    <p className="px-2 py-1 text-xs text-slate-600">{sample.source}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
