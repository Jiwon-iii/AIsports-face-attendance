"use client";

import { useCallback, useState } from "react";
import { fetchJson } from "@/_handlers/http-handler";

export type ManualAttendanceCandidate = {
  userId: string;
  name: string;
  imageDataUrl: string | null;
};

export function useManualAttendanceCandidate() {
  const [data, setData] = useState<ManualAttendanceCandidate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const candidate = await fetchJson<ManualAttendanceCandidate>(
        `/api/users/manual-candidate?userId=${encodeURIComponent(userId)}`,
      );
      setData(candidate);
      return candidate;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "수동 출석 후보 조회에 실패했습니다.";
      setError(message);
      setData(null);
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, isLoading, error, lookup, clear };
}
