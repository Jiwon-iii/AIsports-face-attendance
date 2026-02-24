import { CompreFace } from "@exadel/compreface-js-sdk";

type FaceSampleInput = {
  imageDataUrl: string;
  source: "camera" | "upload";
};

type RecognizeCandidate = {
  subject: string;
  similarity: number;
};

type RecognizeResult = {
  topCandidate: RecognizeCandidate | null;
  secondCandidate: RecognizeCandidate | null;
  hasFace: boolean;
};

type RecognitionApiResult = {
  result?: Array<{
    subjects?: Array<{
      subject?: string;
      similarity?: number;
    }>;
  }>;
};

const DEFAULT_RECOGNITION_LIMIT = 1;
const DEFAULT_PREDICTION_COUNT = 2;
const DEFAULT_MATCH_THRESHOLD = 0.95;
const DEFAULT_MATCH_MARGIN = 0.02;

let recognitionServiceCache: ReturnType<CompreFace["initFaceRecognitionService"]> | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set.`);
  }
  return value;
}

function dataUrlToBase64(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!match || !match[1]) {
    throw new Error("Invalid image data format.");
  }
  return match[1];
}

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrlToBase64(dataUrl);
  const bytes = Buffer.from(base64, "base64");
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function getCompreFaceBaseUrl() {
  const server = getRequiredEnv("COMPREFACE_SERVER");
  const port = Number(process.env.COMPREFACE_PORT || "8000");
  return `${server}:${port}`;
}

export async function deleteFaceSubjectFromEngine(userId: string): Promise<void> {
  const apiKey = getRequiredEnv("COMPREFACE_RECOGNITION_API_KEY");
  const baseUrl = getCompreFaceBaseUrl();
  const subjectUrl = `${baseUrl}/api/v1/recognition/subjects/${encodeURIComponent(userId)}`;

  const response = await fetch(subjectUrl, {
    method: "DELETE",
    headers: {
      "x-api-key": apiKey,
    },
  });

  if (!response.ok && response.status !== 404) {
    const bodyText = await response.text();
    throw new Error(`얼굴 엔진 데이터 삭제 실패(${response.status}): ${bodyText}`);
  }
}

function getRecognitionService() {
  if (recognitionServiceCache) {
    return recognitionServiceCache;
  }

  const server = getRequiredEnv("COMPREFACE_SERVER");
  const port = Number(process.env.COMPREFACE_PORT || "8000");
  const apiKey = getRequiredEnv("COMPREFACE_RECOGNITION_API_KEY");

  const compreFace = new CompreFace(server, port, {
    limit: DEFAULT_RECOGNITION_LIMIT,
    prediction_count: DEFAULT_PREDICTION_COUNT,
  });

  recognitionServiceCache = compreFace.initFaceRecognitionService(apiKey);
  return recognitionServiceCache;
}

export async function registerFaceSamplesToEngine(
  userId: string,
  samples: FaceSampleInput[],
): Promise<void> {
  const baseUrl = getCompreFaceBaseUrl();
  const apiKey = getRequiredEnv("COMPREFACE_RECOGNITION_API_KEY");
  await deleteFaceSubjectFromEngine(userId);

  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i];
    const arrayBuffer = dataUrlToArrayBuffer(sample.imageDataUrl);
    const blob = new Blob([arrayBuffer], { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("file", blob, `sample-${i + 1}.jpg`);

    const url = `${baseUrl}/api/v1/recognition/faces?subject=${encodeURIComponent(userId)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(`얼굴 엔진 등록 실패(샘플 ${i + 1}, ${response.status}): ${bodyText}`);
    }
  }
}

export async function recognizeFaceFromImage(imageDataUrl: string): Promise<RecognizeResult> {
  const recognitionService = getRecognitionService();
  const base64 = dataUrlToBase64(imageDataUrl);

  const response = await recognitionService.recognize<RecognitionApiResult>(base64, {
    limit: DEFAULT_RECOGNITION_LIMIT,
    prediction_count: DEFAULT_PREDICTION_COUNT,
  });

  const faces = response?.result ?? [];
  if (faces.length === 0) {
    return { topCandidate: null, secondCandidate: null, hasFace: false };
  }

  const subjects = faces[0]?.subjects ?? [];
  const first = subjects[0];
  const second = subjects[1];
  if (!first?.subject || typeof first.similarity !== "number") {
    return { topCandidate: null, secondCandidate: null, hasFace: true };
  }

  return {
    hasFace: true,
    topCandidate: {
      subject: first.subject,
      similarity: first.similarity,
    },
    secondCandidate:
      second?.subject && typeof second.similarity === "number"
        ? {
            subject: second.subject,
            similarity: second.similarity,
          }
        : null,
  };
}

export function getFaceMatchThreshold(): number {
  const envValue = process.env.FACE_MATCH_THRESHOLD;
  if (!envValue) {
    return DEFAULT_MATCH_THRESHOLD;
  }

  const parsed = Number(envValue);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
    throw new Error("FACE_MATCH_THRESHOLD must be between 0 and 1.");
  }

  return parsed;
}

export function getFaceMatchMargin(): number {
  const envValue = process.env.FACE_MATCH_MARGIN;
  if (!envValue) {
    return DEFAULT_MATCH_MARGIN;
  }

  const parsed = Number(envValue);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
    throw new Error("FACE_MATCH_MARGIN must be between 0 and 1.");
  }

  return parsed;
}
