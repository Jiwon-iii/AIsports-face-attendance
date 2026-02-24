"use client";

import { useCallback, useState } from "react";
import { fetchJson } from "@/_handlers/http-handler";

export type ParticipantItem = {
  id: string;
  userId: string;
  name: string;
  gender?: "MALE" | "FEMALE";
  age?: number;
  isActive: boolean;
  createdAt: string;
  isAttended: boolean;
  lastAttendanceAt: string | null;
};

type ParticipantList = {
  items: ParticipantItem[];
  count: number;
};

type RefetchOptions = {
  silent?: boolean;
};

export function useParticipants() {
  const [data, setData] = useState<ParticipantItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (options?: RefetchOptions) => {
    const silent = options?.silent === true;
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const payload = await fetchJson<ParticipantList>("/api/users");
      setData(payload.items);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "참가자 조회에 실패했습니다.";
      setError(message);
      setData([]);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  const removeParticipant = useCallback(
    async (userId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await fetchJson<{ deleted: boolean }>(`/api/users/${encodeURIComponent(userId)}`, {
          method: "DELETE",
        });
        await refetch();
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "참가자 삭제에 실패했습니다.";
        setError(message);
        throw caughtError;
      } finally {
        setIsLoading(false);
      }
    },
    [refetch],
  );

  const updateParticipant = useCallback(
    async (
      userId: string,
      input: {
        name: string;
        gender: "MALE" | "FEMALE";
        age: number;
      },
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        await fetchJson<{
          userId: string;
          name: string;
          gender: "MALE" | "FEMALE";
          age: number;
          updatedAt: string;
        }>(`/api/users/${encodeURIComponent(userId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        await refetch();
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : "참가자 수정에 실패했습니다.";
        setError(message);
        throw caughtError;
      } finally {
        setIsLoading(false);
      }
    },
    [refetch],
  );

  const resetAttendanceForParticipant = useCallback(
    async (userId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await fetchJson<{ reset: boolean; userId: string; deletedCount: number }>(
          `/api/attendance/${encodeURIComponent(userId)}`,
          { method: "DELETE" },
        );
        await refetch();
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : "개별 출석 초기화에 실패했습니다.";
        setError(message);
        throw caughtError;
      } finally {
        setIsLoading(false);
      }
    },
    [refetch],
  );

  const resetAllAttendance = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await fetchJson<{ reset: boolean; deletedCount: number }>("/api/attendance/reset", {
        method: "POST",
      });
      await refetch();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "전체 출석 초기화에 실패했습니다.";
      setError(message);
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  }, [refetch]);

  return {
    data,
    isLoading,
    error,
    refetch,
    removeParticipant,
    updateParticipant,
    resetAttendanceForParticipant,
    resetAllAttendance,
  };
}
