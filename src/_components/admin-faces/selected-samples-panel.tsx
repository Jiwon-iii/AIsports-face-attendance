import Image from "next/image";

type SelectedSample = {
  imageDataUrl: string;
  source: "camera" | "upload";
};

type Props = {
  selectedSamples: SelectedSample[];
  maxSamples: number;
  onClear: () => void;
};

export function SelectedSamplesPanel({ selectedSamples, maxSamples, onClear }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">
          선택된 샘플 {selectedSamples.length}/{maxSamples}
        </p>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-semibold text-slate-600 hover:text-slate-800"
        >
          선택 초기화
        </button>
      </div>

      {selectedSamples.length === 0 ? (
        <p className="text-sm text-slate-600">선택된 얼굴 샘플이 없습니다.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {selectedSamples.map((sample, index) => (
            <div
              key={`${sample.source}-${index}`}
              className="overflow-hidden rounded-lg border border-slate-200"
            >
              <Image
                src={sample.imageDataUrl}
                alt={`face-sample-${index + 1}`}
                width={480}
                height={320}
                unoptimized
                className="h-36 w-full object-cover"
              />
              <p className="px-2 py-1 text-xs text-slate-600">{sample.source}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
