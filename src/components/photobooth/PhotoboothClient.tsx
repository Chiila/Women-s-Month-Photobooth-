"use client";

import { Camera, Check, Heart, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
} from "react";
import Webcam from "react-webcam";
import { EventLogos } from "@/components/EventLogos";
import {
  composeFilmStrip,
  TEMPLATE_NATURAL_HEIGHT,
  TEMPLATE_NATURAL_WIDTH,
  TEMPLATE_PATH,
  TEMPLATE_PHOTO_SLOTS_NORM,
  TEMPLATE_SHOT_COUNT,
  TEMPLATE_SLOT_PIXEL_HEIGHT,
  TEMPLATE_SLOT_PIXEL_WIDTH,
} from "@/lib/composeStrip";

type Phase =
  | "idle"
  | "countdown"
  | "review"
  | "uploading"
  | "success"
  | "error";

const COUNTDOWN_SEC = 5;

const STRIP_ASPECT_STYLE = {
  aspectRatio: `${TEMPLATE_NATURAL_WIDTH} / ${TEMPLATE_NATURAL_HEIGHT}`,
} as const;

/** Same proportions as one template photo slot (landscape) — matches exported crop. */
const CAMERA_SLOT_ASPECT_STYLE = {
  aspectRatio: `${TEMPLATE_SLOT_PIXEL_WIDTH} / ${TEMPLATE_SLOT_PIXEL_HEIGHT}`,
} as const;

function pillClass(extra = "") {
  return [
    "inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold tracking-wide shadow-md transition duration-200 hover:scale-[1.02] active:scale-[0.98]",
    extra,
  ].join(" ");
}

/** Live template with captured shots composited in slot positions (preview during session). */
function TemplateStripLive({ shots }: { shots: string[] }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border-4 border-white/90 bg-neutral-300/80 shadow-xl ring-2 ring-white/40"
      style={STRIP_ASPECT_STYLE}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={TEMPLATE_PATH}
        alt=""
        className="pointer-events-none absolute inset-0 z-0 size-full object-fill"
        draggable={false}
      />
      {TEMPLATE_PHOTO_SLOTS_NORM.map((slot, i) => {
        const url = shots[i];
        if (!url) return null;
        return (
          <div
            key={i}
            className="absolute z-10 overflow-hidden shadow-inner ring-2 ring-white/70"
            style={{
              left: `${slot.x * 100}%`,
              top: `${slot.y * 100}%`,
              width: `${slot.w * 100}%`,
              height: `${slot.h * 100}%`,
              borderRadius: "3.5%",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="size-full object-cover"
              draggable={false}
            />
          </div>
        );
      })}
    </div>
  );
}

export function PhotoboothClient() {
  const webcamRef = useRef<ComponentRef<typeof Webcam>>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(COUNTDOWN_SEC);
  const [shots, setShots] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const [stripPreview, setStripPreview] = useState<string | null>(null);
  const [stripBlob, setStripBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [webcamMounted, setWebcamMounted] = useState(false);
  const [stripBuilding, setStripBuilding] = useState(false);

  const composeGenRef = useRef(0);

  useEffect(() => {
    setWebcamMounted(true);
  }, []);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (!webcamMounted || !cameraReady) return;
    if (countdown > 0) {
      const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }

    const tCap = window.setTimeout(() => {
      const camInner = webcamRef.current;
      const snap =
        camInner && typeof camInner.getScreenshot === "function"
          ? (camInner.getScreenshot() ?? null)
          : null;

      if (!snap) {
        setUploadError("Could not capture from camera.");
        setPhase("error");
        return;
      }

      setFlash(true);
      window.setTimeout(() => setFlash(false), 200);

      setShots((prev) => {
        const next = [...prev, snap];
        if (next.length >= TEMPLATE_SHOT_COUNT) {
          setPhase("review");
        } else {
          setCountdown(COUNTDOWN_SEC);
        }
        return next;
      });
    }, 0);

    return () => window.clearTimeout(tCap);
  }, [phase, countdown, webcamMounted, cameraReady]);

  useEffect(() => {
    if (phase !== "review" || shots.length !== TEMPLATE_SHOT_COUNT) {
      setStripBuilding(false);
      return;
    }
    if (shots.some((s) => !s)) return;

    const gen = ++composeGenRef.current;
    setStripBuilding(true);

    void (async () => {
      try {
        const scale =
          typeof window !== "undefined"
            ? Math.min(
                3,
                Math.max(2, Math.round(window.devicePixelRatio * 1.25)),
              )
            : 3;
        const { dataUrl, blob } = await composeFilmStrip(shots, scale);
        if (gen !== composeGenRef.current) return;
        setStripPreview(dataUrl);
        setStripBlob(blob);
      } catch {
        if (gen !== composeGenRef.current) return;
        setUploadError("Could not build your strip.");
        setPhase("error");
      } finally {
        if (gen === composeGenRef.current) setStripBuilding(false);
      }
    })();

    return () => {
      composeGenRef.current += 1;
    };
  }, [phase, shots]);

  const startSession = useCallback(() => {
    setShots([]);
    setStripPreview(null);
    setStripBlob(null);
    setBlobUrl(null);
    setUploadError(null);
    setCameraReady(false);
    setCountdown(COUNTDOWN_SEC);
    setPhase("countdown");
  }, []);

  const redo = useCallback(() => {
    setStripPreview(null);
    setStripBlob(null);
    setBlobUrl(null);
    setShots([]);
    setUploadError(null);
    setPhase("idle");
  }, []);

  const confirmUpload = useCallback(async () => {
    if (!stripBlob) return;
    setPhase("uploading");
    setUploadError(null);
    try {
      const form = new FormData();
      form.append(
        "file",
        stripBlob,
        `womens-month-strip-${Date.now()}.png`,
      );
      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Upload failed");
      }
      if (!data.url) throw new Error("No URL returned");
      setBlobUrl(data.url);
      setPhase("success");
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
      setPhase("error");
    }
  }, [stripBlob]);

  const currentShotIndex = phase === "countdown" ? shots.length : 0;
  const progressLabel = `${Math.min(currentShotIndex + 1, TEMPLATE_SHOT_COUNT)} / ${TEMPLATE_SHOT_COUNT}`;
  const leftLabel =
    phase === "countdown"
      ? countdown > 0
        ? shots.length >= TEMPLATE_SHOT_COUNT - 1
          ? "Last pose"
          : `${TEMPLATE_SHOT_COUNT - shots.length - 1} more after this one`
        : "Capturing…"
      : null;

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-gradient-to-br from-rose-200 via-fuchsia-200 to-violet-300 text-rose-950">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 18% 22%, #fb7185 0%, transparent 42%),
            radial-gradient(circle at 82% 12%, #c084fc 0%, transparent 38%),
            radial-gradient(circle at 50% 88%, #f9a8d4 0%, transparent 48%)`,
        }}
      />

      <div className="relative z-10 flex min-h-[100dvh] flex-1 flex-col px-3 pb-6 pt-5 sm:px-5 lg:px-8">
        <header
          className={`shrink-0 text-center ${phase === "countdown" ? "mb-3" : "mb-5"}`}
        >
          <EventLogos className={`mx-auto ${phase === "countdown" ? "mb-2 max-h-12" : "mb-4"}`} />
          <p className="mb-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-white/50 bg-white/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-700 shadow-md backdrop-blur-md sm:text-xs sm:tracking-[0.2em]">
            <Heart className="size-3 fill-rose-400 text-rose-600" />
            Women&apos;s Month
          </p>
          <h1 className="mt-1 font-serif text-2xl font-semibold leading-tight text-rose-950 drop-shadow-sm sm:mt-2 sm:text-3xl lg:text-4xl">
            Photobooth
          </h1>
          {phase === "idle" && (
            <p className="mx-auto mt-2 max-w-md text-sm text-rose-900/85">
              Five poses on the event strip — template and camera side by side
              while you shoot.
            </p>
          )}
        </header>

        {phase === "idle" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <div className="w-full max-w-md rounded-[2rem] border border-white/60 bg-white/45 p-6 shadow-xl backdrop-blur-xl sm:p-8">
              <div className="mb-5 flex justify-center">
                <div className="rounded-2xl bg-gradient-to-br from-pink-500/20 to-violet-500/20 p-4">
                  <Sparkles className="mx-auto size-11 text-fuchsia-600" />
                </div>
              </div>
              <p className="text-center text-sm leading-relaxed text-rose-900/88">
                <strong className="text-rose-800">5-second countdown</strong>{" "}
                before each photo. Watch the template fill in as you go, then
                confirm your strip.
              </p>
            </div>
            <button
              type="button"
              onClick={startSession}
              className={pillClass(
                "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 text-white shadow-lg shadow-fuchsia-400/40 hover:brightness-110",
              )}
            >
              <Camera className="size-5" />
              Start
            </button>
          </div>
        )}

        {phase === "countdown" && (
          <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row md:items-start md:justify-center md:gap-6 lg:gap-10">
            <div className="flex min-h-0 w-full min-w-0 flex-col items-center md:max-w-[min(36vw,300px)] md:shrink-0">
              <p className="mb-1.5 text-center text-xs font-semibold text-rose-900 sm:text-sm">
                Your strip · {shots.length}/{TEMPLATE_SHOT_COUNT} poses
              </p>
              {leftLabel && (
                <p className="mb-2 text-center text-[11px] text-rose-800/85 sm:text-xs">
                  {leftLabel}
                </p>
              )}
              <div className="w-full max-h-[min(40dvh,440px)] min-[480px]:max-h-[min(50dvh,540px)] md:max-h-[min(85dvh,920px)]">
                <TemplateStripLive shots={shots} />
              </div>
            </div>

            <div className="flex w-full min-w-0 flex-1 flex-col items-stretch md:max-w-[min(92vw,720px)] md:pt-8 lg:max-w-[min(90vw,820px)]">
              <p className="mb-2 text-center text-xs font-semibold text-rose-900 sm:text-sm md:text-left">
                Camera · Photo {progressLabel}
              </p>
              <div
                className="relative mx-auto w-full max-w-full md:mx-0"
                style={CAMERA_SLOT_ASPECT_STYLE}
              >
                <div className="absolute inset-0 overflow-hidden rounded-2xl border-4 border-white/90 shadow-2xl ring-2 ring-white/40">
                  {webcamMounted ? (
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      mirrored
                      screenshotFormat="image/png"
                      screenshotQuality={1}
                      videoConstraints={{
                        facingMode: "user",
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                      }}
                      onUserMedia={() => setCameraReady(true)}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-rose-100/90 text-sm text-rose-700">
                      <Loader2 className="mr-2 size-5 animate-spin" />
                      Preparing camera…
                    </div>
                  )}
                  {!cameraReady && webcamMounted && (
                    <div className="absolute inset-0 flex items-center justify-center bg-rose-100/90 text-sm text-rose-700">
                      <Loader2 className="mr-2 size-5 animate-spin" />
                      Camera…
                    </div>
                  )}
                  {flash && (
                    <div className="pointer-events-none absolute inset-0 animate-pulse bg-white/90" />
                  )}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div
                      className="flex size-28 items-center justify-center rounded-full border-4 border-white/95 bg-gradient-to-br from-pink-500 to-purple-600 text-5xl font-bold text-white shadow-2xl tabular-nums animate-photobooth-count sm:size-32 sm:text-6xl"
                      key={countdown}
                    >
                      {countdown > 0 ? countdown : "✦"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === "review" && stripPreview && (
          <div className="flex min-h-0 flex-1 flex-col items-center gap-4">
            <p className="shrink-0 text-center text-sm font-semibold text-rose-900">
              Review your strip
            </p>
            <div className="flex min-h-0 w-full max-w-lg flex-1 items-center justify-center lg:max-w-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stripPreview}
                alt="Photo strip preview"
                className={`max-h-[min(calc(100dvh-14rem),720px)] w-auto max-w-full rounded-2xl border-4 border-white/90 object-contain object-center shadow-2xl ring-1 ring-white/50 transition-opacity ${stripBuilding ? "opacity-60" : "opacity-100"}`}
              />
            </div>
            {stripBuilding && (
              <p className="flex shrink-0 items-center gap-2 text-xs font-medium text-fuchsia-800">
                <Loader2 className="size-3.5 animate-spin" />
                Building final image…
              </p>
            )}
            <div className="flex w-full shrink-0 flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={redo}
                className={pillClass(
                  "w-full border-2 border-rose-200/90 bg-white/75 text-rose-800 shadow-md backdrop-blur-sm hover:bg-white sm:w-auto",
                )}
              >
                <RotateCcw className="size-5" />
                Redo
              </button>
              <button
                type="button"
                onClick={() => void confirmUpload()}
                disabled={!stripBlob || stripBuilding}
                className={pillClass(
                  "w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white shadow-lg shadow-fuchsia-400/35 hover:brightness-110 disabled:opacity-50 sm:w-auto",
                )}
              >
                <Check className="size-5" />
                Confirm
              </button>
            </div>
          </div>
        )}

        {phase === "review" && !stripPreview && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-rose-800">
            <Loader2 className="size-8 animate-spin text-fuchsia-600" />
            Building your strip…
          </div>
        )}

        {phase === "uploading" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-rose-900">
            <Loader2 className="size-12 animate-spin text-fuchsia-600" />
            <p className="text-sm font-medium">Uploading your strip…</p>
          </div>
        )}

        {phase === "success" && blobUrl && (
          <div className="flex flex-1 flex-col items-center gap-6 text-center">
            <p className="rounded-full border border-emerald-200/80 bg-white/75 px-5 py-2 text-sm font-semibold text-emerald-800 shadow-md backdrop-blur-md">
              You&apos;re all set!
            </p>
            <div className="rounded-3xl border-4 border-white/90 bg-white/80 p-6 shadow-xl backdrop-blur-md">
              <QRCodeSVG
                value={blobUrl}
                size={220}
                level="M"
                includeMargin
                className="mx-auto"
              />
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-rose-900/90">
              Scan to open your strip on your phone.{" "}
              <strong className="text-rose-800">
                Long-press the photo to save
              </strong>{" "}
              to your camera roll.
            </p>
            <a
              href={blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={pillClass(
                "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 text-white shadow-lg",
              )}
            >
              Open image link
            </a>
            <button
              type="button"
              onClick={redo}
              className={pillClass(
                "border-2 border-rose-200 bg-white/75 text-rose-800 shadow-md backdrop-blur-sm",
              )}
            >
              <RotateCcw className="size-5" />
              New session
            </button>
          </div>
        )}

        {phase === "error" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-red-700">{uploadError}</p>
            <button
              type="button"
              onClick={() => {
                if (shots.length === TEMPLATE_SHOT_COUNT) setPhase("review");
                else redo();
              }}
              className={pillClass(
                "bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white",
              )}
            >
              Try again
            </button>
            <button type="button" onClick={redo} className="text-sm underline">
              Start over
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
