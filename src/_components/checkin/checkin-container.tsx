"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TouchEvent } from "react";
import Link from "next/link";
import { CheckinCapturePanel } from "@/_components/checkin/checkin-capture-panel";
import { useManualAttendanceCandidate } from "@/_hooks/use-manual-attendance-candidate";
import { useAttendanceRecords } from "@/_hooks/use-attendance-records";
import { useAttendanceVerify } from "@/_hooks/use-attendance-verify";
import { toDigitsOnly } from "@/_lib/participant-number";

const VERIFY_INTERVAL_GUARD_MS = 1200;
const SUCCESS_COOLDOWN_MS = 5000;
const REQUIRED_CONSECUTIVE_MATCHES = 2;
const MATCH_WINDOW_MS = 8000;
const SWIPE_OPEN_DISTANCE_PX = 20;
const SWIPE_CLOSE_DISTANCE_PX = 28;
const SWIPE_FAST_DISTANCE_PX = 14;
const SWIPE_FAST_DURATION_MS = 180;
const SUCCESS_MESSAGE_DURATION_MS = 1200;
const MANUAL_MESSAGE_DURATION_MS = 1800;
const KIOSK_STATUS_BOTTOM_OFFSET_PX = 72;
const IPAD_MIN_SHORT_SIDE_PX = 744;
const IPAD_PRO_SHORT_SIDE_PX = 834;
const IPAD_ULTRA_SHORT_SIDE_PX = 1024;

export function CheckinContainer() {
  const [isKioskDevice, setIsKioskDevice] = useState(false);
  const [isTabletKiosk, setIsTabletKiosk] = useState(false);
  const [isProTabletKiosk, setIsProTabletKiosk] = useState(false);
  const [isUltraTabletKiosk, setIsUltraTabletKiosk] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualUserId, setManualUserId] = useState("");
  const [manualMessage, setManualMessage] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartAtRef = useRef<number | null>(null);

  const inFlightRef = useRef(false);
  const lastAttemptAtRef = useRef(0);
  const coolDownUntilRef = useRef(0);
  const matchHistoryRef = useRef<Array<{ userId: string; at: number }>>([]);

  const { data: verifyData, error: verifyError, verify } = useAttendanceVerify();
  const { createRecord, isLoading: isManualSubmitting } = useAttendanceRecords();
  const manualCandidateHook = useManualAttendanceCandidate();
  const {
    data: manualCandidate,
    isLoading: isManualCandidateLoading,
    error: manualCandidateError,
    lookup: lookupManualCandidate,
    clear: clearManualCandidate,
  } = manualCandidateHook;
  const activeError = localError || verifyError;
  const statusMessage = successMessage
    ? successMessage
    : pendingMessage
      ? pendingMessage
    : activeError
      ? activeError
      : isProcessing
        ? "얼굴을 확인하고 있습니다."
        : verifyData?.status === "FAILED"
          ? "얼굴이 일치하지 않습니다. 카메라 정면을 바라봐 주세요."
          : null;
  const statusTone: "loading" | "success" | "error" | "warning" = successMessage
    ? "success"
    : pendingMessage
      ? "loading"
    : activeError
      ? "error"
      : isProcessing
        ? "loading"
        : "warning";

  const handleManualConfirm = useCallback(async () => {
    if (!manualCandidate) {
      setManualError("참가자 확인이 필요합니다.");
      return;
    }

    setManualError(null);
    setManualMessage(null);

    try {
      await createRecord({
        userId: manualCandidate.userId,
        checkType: "IN",
        status: "MANUAL",
      });
      setManualMessage(`${manualCandidate.name}님 수동 출석 처리 완료`);
      setManualUserId("");
      clearManualCandidate();
    } catch (error) {
      if (error instanceof Error) {
        setManualError(error.message);
      } else {
        setManualError("수동 출석 처리에 실패했습니다.");
      }
    }
  }, [clearManualCandidate, createRecord, manualCandidate]);

  const handleManualReject = useCallback(() => {
    setManualUserId("");
    setManualMessage(null);
    setManualError(null);
    clearManualCandidate();
  }, [clearManualCandidate]);

  useEffect(() => {
    const trimmedUserId = manualUserId.trim();
    if (!manualOpen || !trimmedUserId) {
      clearManualCandidate();
      return;
    }

    if (manualCandidate?.userId === trimmedUserId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void lookupManualCandidate(trimmedUserId).catch(() => {
        // 메시지는 hook error로 노출한다.
      });
    }, 320);

    return () => window.clearTimeout(timeoutId);
  }, [clearManualCandidate, lookupManualCandidate, manualCandidate?.userId, manualOpen, manualUserId]);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const touchQuery = window.matchMedia("(pointer: coarse)");

    const syncViewport = () => {
      const ua = navigator.userAgent;
      const isMobileOrTabletUa = /iPhone|iPad|iPod|Android/i.test(ua);
      const isIpadOs = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
      const shouldUseKiosk = mobileQuery.matches || touchQuery.matches || isMobileOrTabletUa || isIpadOs;
      const shortSide = Math.min(window.innerWidth, window.innerHeight);
      const isTabletWidth = shortSide >= IPAD_MIN_SHORT_SIDE_PX;
      const isProTablet = shortSide >= IPAD_PRO_SHORT_SIDE_PX;
      const isUltraTablet = shortSide >= IPAD_ULTRA_SHORT_SIDE_PX;
      setIsKioskDevice(shouldUseKiosk);
      setIsTabletKiosk(shouldUseKiosk && isTabletWidth);
      setIsProTabletKiosk(shouldUseKiosk && isProTablet);
      setIsUltraTabletKiosk(shouldUseKiosk && isUltraTablet);
    };

    syncViewport();
    mobileQuery.addEventListener("change", syncViewport);
    touchQuery.addEventListener("change", syncViewport);

    return () => {
      mobileQuery.removeEventListener("change", syncViewport);
      touchQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, SUCCESS_MESSAGE_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  useEffect(() => {
    if (!pendingMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPendingMessage(null);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [pendingMessage]);

  useEffect(() => {
    if (!manualMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setManualMessage(null);
    }, MANUAL_MESSAGE_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [manualMessage]);

  const handleFrame = useCallback(
    async (imageDataUrl: string) => {
      if (manualOpen) {
        return;
      }

      const now = Date.now();
      if (inFlightRef.current) {
        return;
      }
      if (now - lastAttemptAtRef.current < VERIFY_INTERVAL_GUARD_MS) {
        return;
      }
      if (now < coolDownUntilRef.current) {
        return;
      }

      inFlightRef.current = true;
      lastAttemptAtRef.current = now;
      setIsProcessing(true);
      setLocalError(null);

      try {
        const result = await verify({
          imageDataUrl,
          checkType: "IN",
          saveRecord: false,
        });

        if (result.status === "SUCCESS" && result.userId) {
          const nowAt = Date.now();
          matchHistoryRef.current = matchHistoryRef.current
            .filter((item) => nowAt - item.at <= MATCH_WINDOW_MS)
            .concat({ userId: result.userId, at: nowAt });

          const matchedCount = matchHistoryRef.current.filter(
            (item) => item.userId === result.userId,
          ).length;

          if (matchedCount >= REQUIRED_CONSECUTIVE_MATCHES) {
            const saved = await verify({
              imageDataUrl,
              checkType: "IN",
              saveRecord: true,
              expectedUserId: result.userId,
            });

            if (saved.status === "SUCCESS" && saved.alreadyAttended) {
              const displayName = saved.userName ?? saved.userId ?? "참가자";
              setSuccessMessage(`이미 ${displayName}님은 출석을 완료하였습니다.`);
              setPendingMessage(null);
              coolDownUntilRef.current = Date.now() + SUCCESS_COOLDOWN_MS;
              matchHistoryRef.current = [];
              return;
            }

            if (saved.status === "SUCCESS" && saved.recordSaved) {
              const displayName = saved.userName ?? saved.userId ?? "참가자";
              setSuccessMessage(`${displayName}님 출석 인증되었습니다.`);
              setPendingMessage(null);
              coolDownUntilRef.current = Date.now() + SUCCESS_COOLDOWN_MS;
              matchHistoryRef.current = [];
              return;
            }
          }

          const displayName = result.userName ?? result.userId ?? "참가자";
          setPendingMessage(`${displayName}님 확인 중... 한 번 더 정면을 바라봐 주세요.`);
          setSuccessMessage(null);
          return;
        }

        matchHistoryRef.current = [];
        setPendingMessage(null);
        setSuccessMessage(null);
      } catch (error) {
        if (error instanceof Error) {
          setLocalError(error.message);
        }
      } finally {
        inFlightRef.current = false;
        setIsProcessing(false);
      }
    },
    [manualOpen, verify],
  );

  const handleSheetTouchStart = (event: TouchEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, button, a, select")) {
      touchStartYRef.current = null;
      touchStartAtRef.current = null;
      return;
    }

    touchStartYRef.current = event.touches[0]?.clientY ?? null;
    touchStartAtRef.current = Date.now();
  };

  const handleSheetTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const startY = touchStartYRef.current;
    const startAt = touchStartAtRef.current;
    const endY = event.changedTouches[0]?.clientY ?? null;
    touchStartYRef.current = null;
    touchStartAtRef.current = null;

    if (startY === null || startAt === null || endY === null) {
      return;
    }

    const delta = endY - startY;
    const durationMs = Math.max(1, Date.now() - startAt);
    const isFastSwipe = durationMs <= SWIPE_FAST_DURATION_MS;

    const openTriggered =
      delta <= -SWIPE_OPEN_DISTANCE_PX || (isFastSwipe && delta <= -SWIPE_FAST_DISTANCE_PX);
    const closeTriggered =
      delta >= SWIPE_CLOSE_DISTANCE_PX || (isFastSwipe && delta >= SWIPE_FAST_DISTANCE_PX);

    if (!manualOpen && openTriggered) {
      setManualOpen(true);
      return;
    }
    if (manualOpen && closeTriggered) {
      setManualOpen(false);
    }
  };

  const handleSheetTouchMove = (event: TouchEvent<HTMLElement>) => {
    if (event.cancelable) {
      event.preventDefault();
    }
  };

  if (isKioskDevice) {
    const kioskStatusMessage = manualOpen ? null : statusMessage;
    const sheetTranslateClass = manualOpen
      ? "translate-y-0"
      : isUltraTabletKiosk
        ? "translate-y-[88%]"
        : isProTabletKiosk
          ? "translate-y-[89%]"
          : isTabletKiosk
          ? "translate-y-[90%]"
          : "translate-y-[92%]";
    const sheetWidthClass = isUltraTabletKiosk
      ? "max-w-6xl"
      : isProTabletKiosk
        ? "max-w-5xl"
        : isTabletKiosk
          ? "max-w-3xl"
          : "max-w-md";
    const sheetContainerClass = isUltraTabletKiosk
      ? "rounded-t-[2.2rem] px-8 pt-6"
      : isProTabletKiosk
        ? "rounded-t-[2rem] px-7 pt-5"
        : isTabletKiosk
          ? "rounded-t-[1.8rem] px-6 pt-5"
          : "rounded-t-3xl px-4 pt-4";
    const sheetBottomPaddingClass = isUltraTabletKiosk
      ? "pb-[max(28px,env(safe-area-inset-bottom))]"
      : isProTabletKiosk
        ? "pb-[max(26px,env(safe-area-inset-bottom))]"
        : isTabletKiosk
          ? "pb-[max(24px,env(safe-area-inset-bottom))]"
          : "pb-[max(20px,env(safe-area-inset-bottom))]";
    const statusTextClass = isUltraTabletKiosk
      ? "px-10 py-5 text-3xl"
      : isProTabletKiosk
        ? "px-8 py-4 text-2xl"
        : isTabletKiosk
          ? "px-7 py-3.5 text-xl"
          : "px-4 py-2 text-sm";
    const cameraErrorTextClass = isUltraTabletKiosk
      ? "px-10 py-5 text-2xl"
      : isProTabletKiosk
        ? "px-8 py-4 text-xl"
        : isTabletKiosk
          ? "px-7 py-3.5 text-lg"
          : "px-4 py-2 text-sm";
    const titleTextClass = isUltraTabletKiosk
      ? "text-3xl"
      : isProTabletKiosk
        ? "text-2xl"
        : isTabletKiosk
          ? "text-xl"
          : "text-base";
    const bodyTextClass = isUltraTabletKiosk
      ? "text-2xl"
      : isProTabletKiosk
        ? "text-xl"
        : isTabletKiosk
          ? "text-lg"
          : "text-sm";
    const fieldTextClass = isUltraTabletKiosk
      ? "text-2xl"
      : isProTabletKiosk
        ? "text-xl"
        : isTabletKiosk
          ? "text-lg"
          : "text-sm";
    const inputSizeClass = isUltraTabletKiosk
      ? "min-h-24 rounded-2xl px-6 text-3xl"
      : isProTabletKiosk
      ? "min-h-20 rounded-2xl px-5 text-2xl"
      : isTabletKiosk
        ? "min-h-16 rounded-2xl px-4 text-xl"
        : "min-h-12 text-base";
    const buttonSizeClass = isUltraTabletKiosk
      ? "min-h-24 rounded-[999px] px-8 text-3xl"
      : isProTabletKiosk
      ? "min-h-20 rounded-[999px] px-6 text-2xl"
      : isTabletKiosk
        ? "min-h-16 rounded-[999px] px-5 text-xl"
        : "min-h-12 text-base";
    const candidateImageClass = isUltraTabletKiosk
      ? "h-36 w-36"
      : isProTabletKiosk
        ? "h-30 w-30"
        : isTabletKiosk
          ? "h-24 w-24"
          : "h-20 w-20";
    const handleClass = isUltraTabletKiosk
      ? "mb-4 h-2 w-20"
      : isProTabletKiosk
        ? "mb-4 h-2 w-18"
        : isTabletKiosk
          ? "mb-3 h-1.5 w-16"
          : "mb-3 h-1.5 w-14";

    return (
      <main className="relative h-dvh overflow-hidden overscroll-none bg-black">
        <CheckinCapturePanel
          onFrame={handleFrame}
          statusMessage={kioskStatusMessage}
          statusTone={statusTone}
          compact
          statusAnchor="bottom"
          statusBottomOffsetPx={KIOSK_STATUS_BOTTOM_OFFSET_PX}
          statusTextClassName={statusTextClass}
          cameraErrorTextClassName={cameraErrorTextClass}
        />

        <section
          className={`absolute inset-x-0 bottom-0 z-40 max-h-[72dvh] touch-none overflow-y-auto border-t border-white/20 bg-slate-950/92 text-white backdrop-blur transition-transform duration-300 ${sheetContainerClass} ${sheetBottomPaddingClass} ${sheetTranslateClass}`}
          onClick={(event) => event.stopPropagation()}
          onTouchStart={handleSheetTouchStart}
          onTouchMove={handleSheetTouchMove}
          onTouchEnd={handleSheetTouchEnd}
        >
          <div
            aria-hidden
            className={`mx-auto block rounded-full bg-white/40 ${handleClass}`}
          />
          <div className={`mx-auto w-full ${sheetWidthClass}`}>
            <p className={`${titleTextClass} font-semibold`}>인식 실패 시 수동 출석</p>
            <p className={`mt-1 ${bodyTextClass} text-slate-300`}>
              관리자 로그인 상태에서 참가자 번호를 입력해 수동 출석(MANUAL) 처리합니다.
            </p>
            <label className="mt-3 block">
              <span className={`${fieldTextClass} text-slate-300`}>참가자 번호</span>
              <input
                value={manualUserId}
                onChange={(event) => {
                  setManualUserId(toDigitsOnly(event.target.value));
                  setManualMessage(null);
                  setManualError(null);
                }}
                placeholder="예: 10001234"
                className={`mt-1 w-full rounded-xl border border-slate-500 bg-slate-900 px-3 text-white outline-none ring-sky-500/50 transition focus:ring ${inputSizeClass}`}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
              />
            </label>
            {isManualCandidateLoading && (
              <p className={`mt-3 font-semibold text-slate-200 ${bodyTextClass}`}>참가자 정보를 확인 중입니다...</p>
            )}
            {manualCandidate && (
              <div className="mt-3 rounded-2xl border border-slate-600 bg-slate-900/80 p-4">
                <div className="flex items-center gap-3">
                  {manualCandidate.imageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={manualCandidate.imageDataUrl}
                      alt={`${manualCandidate.name} 얼굴 샘플`}
                      className={`${candidateImageClass} rounded-xl border border-slate-600 object-cover`}
                    />
                  ) : (
                    <div
                      className={`flex ${candidateImageClass} items-center justify-center rounded-xl border border-slate-600 text-xs text-slate-300`}
                    >
                      사진 없음
                    </div>
                  )}
                  <div>
                    <p className={`${titleTextClass} font-semibold text-slate-100`}>
                      {manualCandidate.name}님이 맞습니까?
                    </p>
                    <p className={`${bodyTextClass} text-slate-300`}>
                      참가자 번호 {manualCandidate.userId}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleManualConfirm()}
                    disabled={isManualSubmitting}
                    className={`inline-flex flex-1 items-center justify-center rounded-full bg-emerald-600 px-4 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-500 ${buttonSizeClass}`}
                  >
                    예
                  </button>
                  <button
                    type="button"
                    onClick={handleManualReject}
                    disabled={isManualSubmitting}
                    className={`inline-flex flex-1 items-center justify-center rounded-full border border-slate-500 px-4 font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:text-slate-400 ${buttonSizeClass}`}
                  >
                    아니오
                  </button>
                </div>
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <Link
                href="/admin/login?next=/admin/participants"
                className={`inline-flex flex-1 items-center justify-center rounded-full border border-slate-500 px-4 font-semibold text-slate-100 ${buttonSizeClass}`}
              >
                관리자 로그인
              </Link>
            </div>
            {manualMessage && (
              <p className={`mt-3 font-semibold text-emerald-300 ${bodyTextClass}`}>
                {manualMessage}
              </p>
            )}
            {manualError && (
              <p className={`mt-3 font-semibold text-rose-300 ${bodyTextClass}`}>
                {manualError}
              </p>
            )}
            {manualCandidateError && (
              <p className={`mt-3 font-semibold text-rose-300 ${bodyTextClass}`}>
                {manualCandidateError}
              </p>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 md:px-8">
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">ai sport attendance</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">대회 출석 인증</h1>
            <p className="mt-2 text-sm text-slate-600">
              참가자는 카메라 정면을 바라보면 자동으로 인증됩니다. 현장 운영용 PC 화면입니다.
            </p>
          </div>
          <Link
            href="/admin/login"
            className="inline-flex min-h-10 items-center rounded-full border border-slate-900 bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-black"
          >
            관리자 이동
          </Link>
        </div>
      </section>
      <CheckinCapturePanel onFrame={handleFrame} statusMessage={statusMessage} statusTone={statusTone} />
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">인식 실패 대응: 수동 출석</p>
            <p className="text-xs text-slate-600">
              자동 인식이 반복 실패하면 관리자 로그인 후 참가자 번호로 수동 출석 처리하세요.
            </p>
          </div>
          <Link
            href="/admin/login?next=/admin/participants"
            className="inline-flex min-h-10 items-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-black"
          >
            수동 출석 처리로 이동
          </Link>
        </div>
      </section>
    </main>
  );
}
