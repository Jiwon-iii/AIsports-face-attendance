"use client";

import { useCallback, useState } from "react";
import { fetchJson } from "@/_handlers/http-handler";
import { CONSENT_VERSION } from "@/_lib/constants";

export type RegisterInput = {
  name: string;
  gender: "MALE" | "FEMALE";
  age: number;
};

export type RegisterResult = {
  userId: string;
  name: string;
  gender: "MALE" | "FEMALE";
  age: number;
  consentVersion: string;
};

export function useRegisterUser() {
  const [data, setData] = useState<RegisterResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerUser = useCallback(async (input: RegisterInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const userData = await fetchJson<{
        userId: string;
        name: string;
        gender: "MALE" | "FEMALE";
        age: number;
      }>("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name,
          gender: input.gender,
          age: input.age,
        }),
      });

      await fetchJson<{ userId: string; version: string }>("/api/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userData.userId,
          version: CONSENT_VERSION,
        }),
      });

      const result: RegisterResult = {
        userId: userData.userId,
        name: userData.name,
        gender: userData.gender,
        age: userData.age,
        consentVersion: CONSENT_VERSION,
      };
      setData(result);
      return result;
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "등록 처리 중 오류가 발생했습니다.";
      setError(message);
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, error, registerUser };
}
