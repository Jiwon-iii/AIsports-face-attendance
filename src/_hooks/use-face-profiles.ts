"use client";

import { useCallback, useState } from "react";
import { fetchJson } from "@/_handlers/http-handler";

type FaceSampleInput = {
  imageDataUrl: string;
  source: "camera" | "upload";
  capturedAt?: string;
};

export type FaceProfileItem = {
  id: string;
  userId: string;
  sampleCount: number;
  samples: {
    imageDataUrl: string;
    source: "camera" | "upload";
    capturedAt: string;
  }[];
  qualityScore: number | null;
  updatedAt: string;
};

type FaceProfileList = {
  items: FaceProfileItem[];
  count: number;
};

type RefetchOptions = {
  silent?: boolean;
};

export function useFaceProfiles() {
  const [data, setData] = useState<FaceProfileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (userId?: string, options?: RefetchOptions) => {
    const silent = options?.silent === true;
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const search = userId ? `?userId=${encodeURIComponent(userId)}` : "";
      const payload = await fetchJson<FaceProfileList>(`/api/face-profiles${search}`);
      setData(payload.items);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "얼굴 목록 조회 중 오류가 발생했습니다.";
      setError(message);
      setData([]);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  const registerFaceProfile = useCallback(
    async (input: { userId: string; samples: FaceSampleInput[]; qualityScore?: number }) => {
      setIsLoading(true);
      setError(null);

      try {
        await fetchJson<{ id: string }>("/api/face-profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });

        await refetch(input.userId);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "얼굴 등록 중 오류가 발생했습니다.";
        setError(message);
        throw caughtError;
      } finally {
        setIsLoading(false);
      }
    },
    [refetch],
  );

  const removeFaceProfile = useCallback(
    async (id: string, userId?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        await fetchJson<{ deleted: boolean }>(`/api/face-profiles/${id}`, {
          method: "DELETE",
        });
        await refetch(userId);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "얼굴 프로필 삭제 중 오류가 발생했습니다.";
        setError(message);
        throw caughtError;
      } finally {
        setIsLoading(false);
      }
    },
    [refetch],
  );

  return { data, isLoading, error, refetch, registerFaceProfile, removeFaceProfile };
}
