import { randomInt } from "node:crypto";

export const PARTICIPANT_NUMBER_REGEX = /^\d+$/;
export const PARTICIPANT_NUMBER_MIN = 10000000;
export const PARTICIPANT_NUMBER_MAX = 99999999;

export function createParticipantNumberCandidate() {
  return String(randomInt(PARTICIPANT_NUMBER_MIN, PARTICIPANT_NUMBER_MAX + 1));
}

export function isParticipantNumber(value: string) {
  return PARTICIPANT_NUMBER_REGEX.test(value.trim());
}

export function toDigitsOnly(value: string) {
  return value.replace(/\D/g, "");
}
