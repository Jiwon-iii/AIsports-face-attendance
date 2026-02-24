"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckinCapturePanel } from "@/_components/checkin/checkin-capture-panel";
import { useAttendanceVerify } from "@/_hooks/use-attendance-verify";

const VERIFY_INTERVAL_GUARD_MS = 1200;
const SUCCESS_COOLDOWN_MS = 5000;
const REQUIRED_CONSECUTIVE_MATCHES = 2;

export function CheckinContainer() {
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const inFlightRef = useRef(false);
  const lastAttemptAtRef = useRef(0);
  const coolDownUntilRef = useRef(0);
  const consecutiveUserIdRef = useRef<string | null>(null);
  const consecutiveMatchCountRef = useRef(0);

  const { data: verifyData, error: verifyError, verify } = useAttendanceVerify();
  const activeError = localError || verifyError;
  const statusMessage = successMessage
    ? successMessage
    : activeError
      ? activeError
      : isProcessing
        ? "얼굴을 확인하고 있습니다."
        : verifyData?.status === "FAILED"
          ? "얼굴이 일치하지 않습니다. 카메라 정면을 바라봐 주세요."
          : null;
  const statusTone: "loading" | "success" | "error" | "warning" = successMessage
    ? "success"
    : activeError
      ? "error"
      : isProcessing
        ? "loading"
        : "warning";

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

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
          if (consecutiveUserIdRef.current === result.userId) {
            consecutiveMatchCountRef.current += 1;
          } else {
            consecutiveUserIdRef.current = result.userId;
            consecutiveMatchCountRef.current = 1;
          }

          if (consecutiveMatchCountRef.current >= REQUIRED_CONSECUTIVE_MATCHES) {
            const saved = await verify({
              imageDataUrl,
              checkType: "IN",
              saveRecord: true,
              expectedUserId: result.userId,
            });

            if (saved.status === "SUCCESS" && saved.recordSaved) {
              const displayName = saved.userName ?? saved.userId ?? "참가자";
              setSuccessMessage(`${displayName}님 출석 인증되었습니다.`);
              coolDownUntilRef.current = Date.now() + SUCCESS_COOLDOWN_MS;
              consecutiveUserIdRef.current = null;
              consecutiveMatchCountRef.current = 0;
              return;
            }
          }

          setSuccessMessage(null);
          return;
        }

        consecutiveUserIdRef.current = null;
        consecutiveMatchCountRef.current = 0;
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

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:px-8">
      <section className="panel p-5 sm:p-7 md:p-8">
        <div className="mb-6">
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">AI 얼굴 출석 인증</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-700 sm:text-base">
            카메라를 응시하면 자동으로 얼굴을 인식해 출석을 처리합니다.
          </p>
          <Link
            href="/admin/login"
            className="ui-btn-ghost mt-3 inline-flex min-h-10 items-center px-4 text-xs"
          >
            관리자 페이지
          </Link>
        </div>

        <div className="panel border border-slate-200 p-4 sm:p-5">
          <p className="mb-4 text-xs font-mono font-semibold tracking-wide text-slate-500">출석 카메라</p>
          <CheckinCapturePanel
            onFrame={handleFrame}
            statusMessage={statusMessage}
            statusTone={statusTone}
          />
        </div>
      </section>
    </main>
  );
}
