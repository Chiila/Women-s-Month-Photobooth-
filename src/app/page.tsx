import Link from "next/link";
import { Camera, Flower2 } from "lucide-react";
import { EventLogos } from "@/components/EventLogos";

export default function Home() {
  return (
    <div className="relative flex min-h-[100dvh] flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-pink-100 via-fuchsia-50 to-violet-200 px-6 py-16 text-rose-950">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 15% 25%, #f472b6 0%, transparent 42%),
            radial-gradient(circle at 85% 20%, #c084fc 0%, transparent 38%)`,
        }}
      />
      <div className="relative z-10 max-w-lg text-center">
        <EventLogos className="mb-5" />
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-5 py-2 text-sm font-semibold text-rose-700 shadow-md backdrop-blur-sm">
          <Flower2 className="size-5 text-fuchsia-500" />
          Women&apos;s Month
        </div>
        <h1 className="font-serif text-4xl font-semibold leading-tight sm:text-5xl">
          Celebrate with a photobooth moment
        </h1>
        <p className="mt-4 text-base leading-relaxed text-rose-900/80">
          Guided shots, a branded or scrapbook strip, and a QR code to grab your
          photo on your phone.
        </p>
        <Link
          href="/photobooth"
          className="mt-10 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-pink-300/50 transition hover:brightness-105 active:scale-[0.98]"
        >
          <Camera className="size-6" />
          Open photobooth
        </Link>
      </div>
    </div>
  );
}
