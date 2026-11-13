"use client";

import Image from "next/image";

/** Drivers pack poster — right edge of the hero viewport. */
export function HeroPack({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative hidden h-full shrink-0 animate-hero-media md:block ${className}`}
    >
      <Image
        src="/hero/drivers-pack.png"
        alt="Antonelli, Hamilton, Norris, and Verstappen"
        fill
        priority
        quality={92}
        sizes="(min-width: 768px) 34vw, 0px"
        className="object-contain object-right object-bottom"
      />
    </div>
  );
}
