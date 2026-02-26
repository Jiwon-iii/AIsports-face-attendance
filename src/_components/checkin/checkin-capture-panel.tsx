"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onFrame: (imageDataUrl: string) => void;
  statusMessage: string | null;
  statusTone: "loading" | "success" | "error" | "warning";
  compact?: boolean;
  statusAnchor?: "top" | "bottom";
  statusBottomOffsetPx?: number;
  statusTextClassName?: string;
  cameraErrorTextClassName?: string;
};

export function CheckinCapturePanel({
  onFrame,
  statusMessage,
  statusTone,
  compact = false,
  statusAnchor = "bottom",
  statusBottomOffsetPx = 12,
  statusTextClassName,
  cameraErrorTextClassName,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const onFrameRef = useRef(onFrame);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const statusTypographyClass = statusTextClassName ?? "text-xs sm:text-sm";
  const cameraErrorTypographyClass = cameraErrorTextClassName ?? "text-xs sm:text-sm";

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    const captureFrame = () => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      const sourceWidth = video.videoWidth;
      const sourceHeight = video.videoHeight;
      const targetAspect = 3 / 4; // mobile-like portrait ratio
      const sourceAspect = sourceWidth / sourceHeight;

      let cropWidth = sourceWidth;
      let cropHeight = sourceHeight;
      if (sourceAspect > targetAspect) {
        cropWidth = Math.floor(sourceHeight * targetAspect);
      } else {
        cropHeight = Math.floor(sourceWidth / targetAspect);
      }

      const cropX = Math.floor((sourceWidth - cropWidth) / 2);
      const cropY = Math.floor((sourceHeight - cropHeight) / 2);

      const canvas = document.createElement("canvas");
      canvas.width = cropWidth;
      canvas.height = cropHeight;

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      context.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      onFrameRef.current(dataUrl);
    };

    const startCamera = async () => {
      if (typeof window !== "undefined" && !window.isSecureContext) {
        setCameraError("카메라 권한은 HTTPS에서만 동작합니다. 로컬 테스트는 HTTPS 주소로 접속해 주세요.");
        return;
      }

      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        setCameraError("현재 브라우저에서는 카메라를 지원하지 않습니다. Safari 또는 Chrome에서 열어 주세요.");
        return;
      }

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 720 },
              height: { ideal: 960 },
              aspectRatio: { ideal: 3 / 4 },
              frameRate: { ideal: 24, max: 30 },
            },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: false,
          });
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        intervalRef.current = window.setInterval(captureFrame, 1400);
      } catch (error) {
        console.error("[CheckinCapturePanel] camera start failed", error);
        setCameraError("카메라를 시작할 수 없습니다. 브라우저 권한을 확인해 주세요.");
      }
    };

    void startCamera();

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  return (
    <section
      className={
        compact
          ? "h-dvh w-full bg-black"
          : "rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      }
    >
      <div
        className={
          compact
            ? "h-full w-full bg-black"
            : "rounded-2xl border border-slate-900 bg-black p-2 shadow-[0_14px_34px_rgba(15,23,42,0.16)]"
        }
      >
        <div className="relative overflow-hidden rounded-lg">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={
              compact
                ? "h-dvh w-full object-cover"
                : "h-[54vh] min-h-[360px] w-full rounded-lg object-cover sm:h-[60vh] sm:min-h-[430px] lg:h-[64vh] lg:min-h-[500px]"
            }
          />
          {statusMessage && (
            <div
              className={`pointer-events-none absolute inset-x-0 z-30 flex justify-center px-3 ${
                statusAnchor === "top" ? "top-3" : ""
              }`}
              style={statusAnchor === "bottom" ? { bottom: `${statusBottomOffsetPx}px` } : undefined}
            >
              <span
                className={`rounded-full px-4 py-2 font-semibold ${statusTypographyClass} ${
                  statusTone === "success"
                    ? "bg-emerald-600/95 text-white"
                    : statusTone === "error"
                      ? "bg-rose-600/95 text-white"
                      : statusTone === "warning"
                        ? "bg-amber-400/95 text-slate-900"
                        : "bg-slate-900/90 text-slate-100"
                }`}
              >
                {statusMessage}
              </span>
            </div>
          )}
          {cameraError && (
            <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
              <span
                className={`rounded-full bg-rose-600/90 px-4 py-2 font-semibold text-white ${cameraErrorTypographyClass}`}
              >
                {cameraError}
              </span>
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <div className="mt-4 grid gap-2">
          <p className="text-sm font-semibold text-slate-900">자동 출석 안내</p>
          <p className="text-sm text-slate-600">
            카메라 정면을 바라보고 1~2초 정지해 주세요. 인증 성공 시 즉시 출석 처리됩니다.
          </p>
        </div>
      )}

      {cameraError && !compact && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {cameraError}
        </p>
      )}
    </section>
  );
}
