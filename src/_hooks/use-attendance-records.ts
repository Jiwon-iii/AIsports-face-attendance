"use client";

import { useCallback, useState } from "react";
import { fetchJson } from "@/_handlers/http-handler";

export type AttendanceRecordItem = {
  id: string;
  userId: string;
  checkType: "IN" | "OUT";
  status: "SUCCESS" | "FAILED" | "MANUAL";
  matchedScore: number | null;
  livenessScore: number | null;
  capturedAt: string;
  deviceId: string | null;
};

type AttendanceList = {
  items: AttendanceRecordItem[];
  count: number;
};

type CreateAttendanceInput = {
  userId: string;
  checkType: "IN" | "OUT";
  status: "SUCCESS" | "FAILED" | "MANUAL";
  matchedScore?: number;
  livenessScore?: number;
  deviceId?: string;
};

export function useAttendanceRecords() {
  const [data, setData] = useState<AttendanceRecordItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (userId?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const search = userId ? `?userId=${encodeURIComponent(userId)}` : "";
      const payload = await fetchJson<AttendanceList>(`/api/attendance${search}`);
      setData(payload.items);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "출석 목록 조회 중 오류가 발생했습니다.";
      setError(message);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createRecord = useCallback(
    async (input: CreateAttendanceInput) => {
      setIsLoading(true);
      setError(null);

      try {
        const payload = await fetchJson<AttendanceRecordItem>("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        return payload;
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "출석 저장 중 오류가 발생했습니다.";
        setError(message);
        throw caughtError;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { data, isLoading, error, refetch, createRecord };
}
