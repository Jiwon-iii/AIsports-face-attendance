"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";
import { RegisteredFaceProfiles } from "@/_components/admin-faces/registered-face-profiles";
import { SelectedSamplesPanel } from "@/_components/admin-faces/selected-samples-panel";
import { StateBanner } from "@/_components/common/state-banner";
import { fileToDataUrl } from "@/_handlers/image-handler";
import { useFaceProfiles } from "@/_hooks/use-face-profiles";

const MAX_SAMPLES = 3;

type SelectedSample = {
  imageDataUrl: string;
  source: "camera" | "upload";
};

export function AdminFacesContainer() {
  const [userId, setUserId] = useState("");
  const [selectedSamples, setSelectedSamples] = useState<SelectedSample[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [qualityScore, setQualityScore] = useState("0.9");
  const { data, isLoading, error, refetch, registerFaceProfile, removeFaceProfile } =
    useFaceProfiles();

  const activeError = localError || error;
  const emptyStateVisible = !isLoading && !activeError && data.length === 0;
  const submitDisabled = isLoading || !userId.trim() || selectedSamples.length === 0;

  const handleSelectFiles = async (
    event: ChangeEvent<HTMLInputElement>,
    source: "camera" | "upload",
  ) => {
    setLocalError(null);

    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const currentCount = selectedSamples.length;
    const availableCount = Math.max(0, MAX_SAMPLES - currentCount);
    const picked = Array.from(files).slice(0, availableCount);

    if (availableCount === 0) {
      setLocalError(`샘플은 최대 ${MAX_SAMPLES}개까지 등록할 수 있습니다.`);
      return;
    }

    try {
      const urls = await Promise.all(picked.map((file) => fileToDataUrl(file)));
      const nextSamples = urls.map((imageDataUrl) => ({ imageDataUrl, source }));
      setSelectedSamples((prev) => [...prev, ...nextSamples]);
    } catch {
      setLocalError("이미지 처리 중 오류가 발생했습니다.");
    } finally {
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);

    if (!userId.trim()) {
      setLocalError("사용자 ID를 입력해 주세요.");
      return;
    }

    if (selectedSamples.length === 0) {
      setLocalError("최소 1개의 얼굴 이미지를 선택해 주세요.");
      return;
    }

    const parsedQuality = Number(qualityScore);
    if (Number.isNaN(parsedQuality) || parsedQuality < 0 || parsedQuality > 1) {
      setLocalError("품질 점수는 0~1 범위로 입력해 주세요.");
      return;
    }

    try {
      await registerFaceProfile({
        userId: userId.trim(),
        samples: selectedSamples.map((sample) => ({
          imageDataUrl: sample.imageDataUrl,
          source: sample.source,
        })),
        qualityScore: parsedQuality,
      });
      setSelectedSamples([]);
    } catch {
      // API 메시지는 hook의 error 상태로 표시한다.
    }
  };

  const handleSearch = async () => {
    setLocalError(null);
    if (!userId.trim()) {
      setLocalError("조회할 사용자 ID를 입력해 주세요.");
      return;
    }
    await refetch(userId.trim());
  };

  const clearSamples = () => setSelectedSamples([]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 sm:py-10 md:px-8 lg:px-10 lg:py-12">
      <div className="panel p-5 sm:p-8 md:p-10">
        <p className="mb-3 font-mono text-[11px] font-semibold tracking-wide text-sky-900 sm:text-xs">
          /admin/faces
        </p>
        <h1 className="mb-4 text-2xl font-bold text-slate-900 sm:text-3xl md:text-4xl">
          관리자 얼굴 등록
        </h1>
        <p className="mb-6 max-w-3xl text-sm leading-6 text-slate-700 sm:mb-8 sm:text-base">
          동의된 사용자에 한해 얼굴 샘플(최대 3장)을 등록합니다. 등록된 샘플은 출석 매칭 기준 데이터로 사용됩니다.
        </p>

        <form onSubmit={handleSubmit} className="grid gap-5 sm:gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-800">사용자 ID</span>
              <input
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none ring-sky-200 transition focus:ring"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                placeholder="예: user-0001"
                autoComplete="off"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-800">품질 점수 (0~1)</span>
              <input
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none ring-sky-200 transition focus:ring"
                value={qualityScore}
                onChange={(event) => setQualityScore(event.target.value)}
                placeholder="0.9"
                autoComplete="off"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-sm font-semibold text-slate-800">카메라 촬영 등록</span>
              <input
                type="file"
                accept="image/*"
                capture="user"
                className="text-sm"
                onChange={(event) => void handleSelectFiles(event, "camera")}
              />
            </label>

            <label className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-sm font-semibold text-slate-800">이미지 업로드</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="text-sm"
                onChange={(event) => void handleSelectFiles(event, "upload")}
              />
            </label>
          </div>

          <SelectedSamplesPanel
            selectedSamples={selectedSamples}
            maxSamples={MAX_SAMPLES}
            onClear={clearSamples}
          />

          {isLoading && <StateBanner tone="loading" message="처리 중입니다..." />}
          {activeError && <StateBanner tone="error" message={activeError} />}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitDisabled}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-sky-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              얼굴 등록 저장
            </button>
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={isLoading}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              등록 이력 조회
            </button>
          </div>
        </form>

        <RegisteredFaceProfiles
          items={data}
          isLoading={isLoading}
          emptyStateVisible={emptyStateVisible}
          selectedUserId={userId.trim()}
          onDelete={removeFaceProfile}
        />

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center rounded-full bg-slate-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            관리자 홈
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-full bg-sky-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
          >
            메인 홈
          </Link>
        </div>
      </div>
    </main>
  );
}
