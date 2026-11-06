"use client";

import Image from "next/image";

/** Drivers pack poster — fixed box, never collapses or overlaps neighbors. */
export function HeroPack({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative mx-auto h-[28rem] w-[16rem] shrink-0 animate-hero-media sm:h-[32rem] sm:w-[18rem] lg:mx-0 lg:h-[min(72svh,36rem)] lg:w-[20rem] xl:w-[22rem] ${className}`}
    >
      <Image
        src="/hero/drivers-pack.png"
        alt="Antonelli, Hamilton, Norris, and Verstappen"
        fill
        priority
        quality={92}
        sizes="352px"
        className="animate-pack-breathe object-contain object-bottom"
      />
    </div>
  );
}
