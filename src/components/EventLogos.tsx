import Image from "next/image";

export function EventLogos({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-6 sm:gap-10 ${className}`}
    >
      <Image
        src="/AWSCC.png"
        alt="AWS Cloud Club"
        width={400}
        height={120}
        className="h-16 w-auto max-w-[min(340px,88vw)] object-contain sm:h-24 sm:max-w-[min(380px,46vw)] md:h-28 md:max-w-[min(440px,46vw)]"
        priority
      />
      <Image
        src="/AWSUG.png"
        alt="AWS User Group"
        width={400}
        height={120}
        className="h-16 w-auto max-w-[min(340px,88vw)] object-contain sm:h-24 sm:max-w-[min(380px,46vw)] md:h-28 md:max-w-[min(440px,46vw)]"
        priority
      />
    </div>
  );
}
