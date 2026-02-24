"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckinCapturePanel } from "@/_components/checkin/checkin-capture-panel";
import { useAttendanceVerify } from "@/_hooks/use-attendance-verify";

const VERIFY_INTERVAL_GUARD_MS = 1200;
const SUCCESS_COOLDOWN_MS = 5000;
const REQUIRED_CONSECUTIVE_MATCHES = 2;
const MATCH_WINDOW_MS = 8000;

export function CheckinContainer() {
  const [isKioskDevice, setIsKioskDevice] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const inFlightRef = useRef(false);
  const lastAttemptAtRef = useRef(0);
  const coolDownUntilRef = useRef(0);
  const matchHistoryRef = useRef<Array<{ userId: string; at: number }>>([]);

  const { data: verifyData, error: verifyError, verify } = useAttendanceVerify();
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

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const touchQuery = window.matchMedia("(pointer: coarse)");

    const syncViewport = () => {
      const ua = navigator.userAgent;
      const isMobileOrTabletUa = /iPhone|iPad|iPod|Android/i.test(ua);
      const isIpadOs = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
      const shouldUseKiosk = mobileQuery.matches || touchQuery.matches || isMobileOrTabletUa || isIpadOs;
      setIsKioskDevice(shouldUseKiosk);
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
    }, 3000);

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

  const handleFrame = useCallback(
    async (imageDataUrl: string) => {
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
    [verify],
  );

  if (isKioskDevice) {
    return (
      <main className="min-h-dvh bg-black">
        <CheckinCapturePanel
          onFrame={handleFrame}
          statusMessage={statusMessage}
          statusTone={statusTone}
          compact
        />
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
    </main>
  );
}
