"use client";

import { useCallback, useState } from "react";
import { fetchJson } from "@/_handlers/http-handler";

type VerifyInput = {
  imageDataUrl: string;
  checkType?: "IN" | "OUT";
  deviceId?: string;
  livenessScore?: number;
  saveRecord?: boolean;
  expectedUserId?: string;
};

export type VerifyResult = {
  id: string | null;
  userId: string | null;
  userName: string | null;
  status: "SUCCESS" | "FAILED";
  checkType: "IN" | "OUT";
  matchedScore: number | null;
  secondMatchedScore?: number | null;
  predictedUserId: string | null;
  threshold: number;
  margin?: number;
  hasFace: boolean;
  capturedAt: string;
  recordSaved: boolean;
};

export function useAttendanceVerify() {
  const [data, setData] = useState<VerifyResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async (input: VerifyInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const payload = await fetchJson<VerifyResult>("/api/attendance/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      setData(payload);
      return payload;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "출석 인증 중 오류가 발생했습니다.";
      setError(message);
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, error, verify };
}
