"use client";

import { ChangeEvent, FormEvent, MouseEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RegisteredFaceProfiles } from "@/_components/admin-faces/registered-face-profiles";
import { StateBanner } from "@/_components/common/state-banner";
import { fetchJson } from "@/_handlers/http-handler";
import { fileToDataUrl } from "@/_handlers/image-handler";
import { useFaceProfiles } from "@/_hooks/use-face-profiles";
import { ParticipantItem, useParticipants } from "@/_hooks/use-participants";
import { useRegisterUser } from "@/_hooks/use-register-user";

const MAX_SAMPLES = 3;
const ADMIN_REFRESH_INTERVAL_MS = 3000;

type SelectedSample = {
  imageDataUrl: string;
  source: "upload";
  fileName: string;
};

function normalizeGenderText(gender?: "MALE" | "FEMALE") {
  if (gender === "MALE") {
    return "남";
  }
  if (gender === "FEMALE") {
    return "여";
  }
  return "-";
}

function formatAttendanceTime(iso: string | null) {
  if (!iso) {
    return "-";
  }
  return new Date(iso).toLocaleString();
}

export function AdminParticipantsContainer() {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [age, setAge] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [selectedSamples, setSelectedSamples] = useState<SelectedSample[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const registerUserHook = useRegisterUser();
  const facesHook = useFaceProfiles();
  const participantsHook = useParticipants();
  const { refetch: refetchParticipants } = participantsHook;
  const { refetch: refetchFaceProfiles } = facesHook;

  const isEditMode = editingUserId !== null;
  const isLoading = registerUserHook.isLoading || facesHook.isLoading || participantsHook.isLoading;
  const activeError = localError || registerUserHook.error || facesHook.error || participantsHook.error;
  const emptyFaceStateVisible =
    selectedUserId.length > 0 && !isLoading && !activeError && facesHook.data.length === 0;
  const selectedParticipant = useMemo(
    () => participantsHook.data.find((participant) => participant.userId === selectedUserId) ?? null,
    [participantsHook.data, selectedUserId],
  );
  const isEditPristine = useMemo(() => {
    if (!isEditMode || !selectedParticipant) {
      return false;
    }

    const isNameSame = name.trim() === selectedParticipant.name;
    const isGenderSame = gender === (selectedParticipant.gender ?? "MALE");
    const isAgeSame = age.trim() === String(selectedParticipant.age ?? "");
    const isNoNewSample = selectedSamples.length === 0;

    return isNameSame && isGenderSame && isAgeSame && isNoNewSample;
  }, [age, gender, isEditMode, name, selectedParticipant, selectedSamples.length]);

  useEffect(() => {
    void refetchParticipants({ silent: true });
  }, [refetchParticipants]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }
      void refetchParticipants({ silent: true });
      if (selectedUserId) {
        void refetchFaceProfiles(selectedUserId, { silent: true });
      }
    }, ADMIN_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [refetchFaceProfiles, refetchParticipants, selectedUserId]);

  const resetForm = () => {
    setName("");
    setGender("MALE");
    setAge("");
    setConsentChecked(false);
    setSelectedSamples([]);
    setEditingUserId(null);
  };

  const handleSelectFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);

    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const availableCount = Math.max(0, MAX_SAMPLES - selectedSamples.length);
    const picked = Array.from(files).slice(0, availableCount);
    if (availableCount === 0) {
      setLocalError(`샘플은 최대 ${MAX_SAMPLES}개까지 등록할 수 있습니다.`);
      return;
    }

    try {
      const urls = await Promise.all(picked.map((file) => fileToDataUrl(file)));
      const next = urls.map((imageDataUrl, index) => ({
        imageDataUrl,
        source: "upload" as const,
        fileName: picked[index]?.name ?? `sample-${index + 1}.jpg`,
      }));
      setSelectedSamples((prev) => [...prev, ...next]);
    } catch {
      setLocalError("이미지 처리 중 오류가 발생했습니다.");
    } finally {
      event.target.value = "";
    }
  };

  const handleSelectParticipantRow = async (participant: ParticipantItem) => {
    setLocalError(null);
    setSuccessMessage(null);
    setEditingUserId(participant.userId);
    setSelectedUserId(participant.userId);
    setName(participant.name);
    setGender(participant.gender ?? "MALE");
    setAge(participant.age ? String(participant.age) : "");
    setSelectedSamples([]);
    await facesHook.refetch(participant.userId);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setLocalError("이름을 입력해 주세요.");
      return;
    }

    const parsedAge = Number(age);
    if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      setLocalError("나이는 1~120 범위의 정수로 입력해 주세요.");
      return;
    }

    if (!isEditMode) {
      if (!consentChecked) {
        setLocalError("안면 데이터 처리 동의가 필요합니다.");
        return;
      }

      if (selectedSamples.length === 0) {
        setLocalError("최소 1개의 얼굴 이미지를 등록해 주세요.");
        return;
      }
    }

    let createdUserId: string | null = null;

    try {
      if (isEditMode && editingUserId) {
        await participantsHook.updateParticipant(editingUserId, {
          name: name.trim(),
          gender,
          age: parsedAge,
        });

        if (selectedSamples.length > 0) {
          await facesHook.registerFaceProfile({
            userId: editingUserId,
            samples: selectedSamples.map((sample) => ({
              imageDataUrl: sample.imageDataUrl,
              source: sample.source,
            })),
          });
        } else {
          await facesHook.refetch(editingUserId);
        }

        await refetchParticipants();
        setSelectedUserId(editingUserId);
        setSelectedSamples([]);
        setSuccessMessage(`${name.trim()} 참가자 정보를 수정했습니다.`);
        return;
      }

      const registered = await registerUserHook.registerUser({
        name: name.trim(),
        gender,
        age: parsedAge,
      });
      createdUserId = registered.userId;

      await facesHook.registerFaceProfile({
        userId: registered.userId,
        samples: selectedSamples.map((sample) => ({
          imageDataUrl: sample.imageDataUrl,
          source: sample.source,
        })),
      });

      await refetchParticipants();
      setSelectedUserId(registered.userId);
      setSuccessMessage(`등록 완료: ${registered.name}`);
      resetForm();
      await facesHook.refetch(registered.userId);
    } catch (error) {
      if (createdUserId) {
        try {
          await fetchJson<{ deleted: boolean }>(`/api/users/${encodeURIComponent(createdUserId)}`, {
            method: "DELETE",
          });
          await refetchParticipants();
        } catch {
          // 롤백 실패는 원본 에러를 우선 노출한다.
        }
      }

      if (error instanceof Error) {
        setLocalError(error.message);
      } else {
        setLocalError("저장 중 오류가 발생했습니다.");
      }
    }
  };

  const handleResetAttendanceForParticipant = async (participant: ParticipantItem) => {
    const ok = window.confirm(`${participant.name} 참가자의 출석 상태를 취소하시겠습니까?`);
    if (!ok) {
      return;
    }

    setLocalError(null);
    setSuccessMessage(null);
    try {
      await participantsHook.resetAttendanceForParticipant(participant.userId);
      setSuccessMessage(`${participant.name} 참가자의 출석을 취소했습니다.`);
    } catch (error) {
      if (error instanceof Error) {
        setLocalError(error.message);
      }
    }
  };

  const handleResetAllAttendance = async () => {
    const ok = window.confirm("전체 참가자 출석 상태를 초기화하시겠습니까?");
    if (!ok) {
      return;
    }

    setLocalError(null);
    setSuccessMessage(null);
    try {
      await participantsHook.resetAllAttendance();
      setSuccessMessage("전체 출석 상태를 초기화했습니다.");
    } catch (error) {
      if (error instanceof Error) {
        setLocalError(error.message);
      }
    }
  };

  const handleParticipantsBlankClick = (event: MouseEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (!isEditPristine) {
      return;
    }
    resetForm();
    setSelectedUserId("");
    setLocalError(null);
    setSuccessMessage(null);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 md:px-8">
      <section className="panel p-5 sm:p-8 md:p-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">참가자 관리</h1>
          <Link
            href="/"
            className="ui-btn-ghost inline-flex min-h-10 items-center justify-center px-4 text-sm"
          >
            처음 화면으로
          </Link>
        </div>
        <p className="mb-6 text-sm leading-6 text-slate-700 sm:text-base">
          참가자 정보를 등록, 조회, 수정, 삭제할 수 있습니다.
        </p>

        <form onSubmit={handleSubmit} className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-800">이름</span>
              <input
                className="ui-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="참가자 이름"
                autoComplete="off"
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-800">성별</span>
              <select
                className="ui-input"
                value={gender}
                onChange={(event) => setGender(event.target.value as "MALE" | "FEMALE")}
              >
                <option value="MALE">남</option>
                <option value="FEMALE">여</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-800">나이</span>
              <input
                type="number"
                min={1}
                max={120}
                className="ui-input"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                placeholder="예: 12"
              />
            </label>
          </div>

          {!isEditMode && (
            <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(event) => setConsentChecked(event.target.checked)}
              />
              <span className="text-sm text-slate-800">안면 데이터 처리 동의</span>
            </label>
          )}

          <label className="grid cursor-pointer gap-2 rounded-2xl border border-slate-300 bg-white p-5 transition hover:bg-slate-50">
            <span className="text-sm font-semibold text-slate-900">
              {isEditMode ? "새 얼굴 이미지 업로드 (선택, 업로드 시 기존 사진 교체)" : "얼굴 이미지 업로드"}
            </span>
            <span className="text-xs text-slate-600">
              이 영역을 클릭해 파일을 선택하세요. JPG/PNG, 최대 {MAX_SAMPLES}장
            </span>
            <span className="inline-flex w-fit rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {selectedSamples.length > 0
                ? `선택됨: ${selectedSamples.map((sample) => sample.fileName).join(", ")}`
                : "클릭하여 파일 선택"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => void handleSelectFiles(event)}
            />
          </label>

          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {successMessage}
            </div>
          )}
          {isLoading && <StateBanner tone="loading" message="처리 중입니다..." />}
          {activeError && <StateBanner tone="error" message={activeError} />}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="ui-btn-primary inline-flex items-center justify-center"
            >
              {isEditMode ? "수정 저장" : "등록 저장"}
            </button>
            {isEditMode && (
              <button
                type="button"
                onClick={resetForm}
                disabled={isLoading}
                className="ui-btn-ghost inline-flex min-h-11 items-center justify-center px-5 text-sm disabled:cursor-not-allowed disabled:text-slate-400"
              >
                수정 취소
              </button>
            )}
          </div>
        </form>

        <section
          className="mt-8 rounded-xl border border-slate-200 p-4 sm:p-5"
          onClick={handleParticipantsBlankClick}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">참가자 목록</h2>
            <button
              type="button"
              onClick={() => void handleResetAllAttendance()}
              disabled={isLoading}
              className="inline-flex min-h-10 items-center rounded-full border border-rose-300 bg-white px-4 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-rose-300"
            >
              전체 출석 초기화
            </button>
          </div>
          <p className="mb-3 text-sm text-slate-600">
            참가자를 선택하면 수정 모드로 전환되고 등록된 얼굴 사진이 아래에 표시됩니다.
          </p>
          {participantsHook.data.length === 0 ? (
            <p className="text-sm text-slate-600">등록된 참가자가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[620px] border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-slate-700">
                  <tr>
                    <th className="px-4 py-3">고유 ID</th>
                    <th className="px-4 py-3">이름</th>
                    <th className="px-4 py-3">성별</th>
                    <th className="px-4 py-3">나이</th>
                    <th className="px-4 py-3">출석 여부</th>
                    <th className="px-4 py-3">출석 취소</th>
                    <th className="px-4 py-3">삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {participantsHook.data.map((participant) => {
                    const isSelected = selectedUserId === participant.userId;
                    return (
                      <tr
                        key={participant.id}
                        className={`cursor-pointer border-t border-slate-200 transition ${
                          isSelected ? "bg-cyan-50" : "hover:bg-slate-50"
                        }`}
                        onClick={() => void handleSelectParticipantRow(participant)}
                      >
                        <td className="px-4 py-3 text-slate-900">{participant.userId}</td>
                        <td className="px-4 py-3 text-slate-900">{participant.name}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {normalizeGenderText(participant.gender)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{participant.age ?? "-"}</td>
                        <td className="px-4 py-3">
                          {participant.isAttended ? (
                            <div className="grid gap-1">
                              <span className="inline-flex w-fit rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                                출석 완료
                              </span>
                              <span className="text-xs text-slate-500">
                                {formatAttendanceTime(participant.lastAttendanceAt)}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                              미출석
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {participant.isAttended ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleResetAttendanceForParticipant(participant);
                              }}
                              disabled={isLoading}
                              className="inline-flex min-h-9 items-center rounded-full bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              출석 취소
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void (async () => {
                                await participantsHook.removeParticipant(participant.userId);
                                if (selectedUserId === participant.userId) {
                                  setSelectedUserId("");
                                  resetForm();
                                  await facesHook.refetch();
                                }
                              })();
                            }}
                            disabled={isLoading}
                            className="inline-flex min-h-9 items-center rounded-full bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
                          >
                            참가자 삭제
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedParticipant ? (
          <p className="mt-8 text-sm text-slate-700">
            선택 참가자: {selectedParticipant.name} ({selectedParticipant.userId})
          </p>
        ) : (
          <p className="mt-8 text-sm text-slate-600">
            참가자 목록에서 한 명을 클릭하면 등록된 얼굴 사진이 표시됩니다.
          </p>
        )}
        <RegisteredFaceProfiles
          items={selectedParticipant ? facesHook.data : []}
          isLoading={isLoading}
          emptyStateVisible={selectedParticipant ? emptyFaceStateVisible : false}
          selectedUserId={selectedUserId}
          onDelete={facesHook.removeFaceProfile}
        />
      </section>
    </main>
  );
}
