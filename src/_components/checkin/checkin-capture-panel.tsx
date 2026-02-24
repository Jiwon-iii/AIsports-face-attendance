"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onFrame: (imageDataUrl: string) => void;
  statusMessage: string | null;
  statusTone: "loading" | "success" | "error" | "warning";
};

export function CheckinCapturePanel({ onFrame, statusMessage, statusTone }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const onFrameRef = useRef(onFrame);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    const captureFrame = () => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      onFrameRef.current(dataUrl);
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });

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
    <section className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-cyan-50 p-5">
      <div className="rounded-xl border border-cyan-200 bg-black p-2">
        <div className="relative overflow-hidden rounded-lg">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-[56vh] min-h-[360px] w-full rounded-lg object-cover sm:h-[62vh] sm:min-h-[440px] lg:h-[68vh] lg:min-h-[520px]"
          />
          {statusMessage && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3">
              <span
                className={`rounded-full px-4 py-2 text-xs font-semibold sm:text-sm ${
                  statusTone === "success"
                    ? "bg-emerald-600/90 text-white"
                    : statusTone === "error"
                      ? "bg-rose-600/90 text-white"
                      : statusTone === "warning"
                        ? "bg-amber-400/95 text-slate-900"
                        : "bg-cyan-950/80 text-cyan-50"
                }`}
              >
                {statusMessage}
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-700">
        카메라를 정면으로 바라봐 주세요. 출석은 자동으로 처리됩니다.
      </p>

      {cameraError && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {cameraError}
        </p>
      )}
    </section>
  );
}
