"use client";

import Image from "next/image";

/** Drivers pack poster — fills the right side of the hero viewport. */
export function HeroPack({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative ml-auto hidden h-full min-w-0 flex-1 animate-hero-media lg:block ${className}`}
    >
      <Image
        src="/hero/drivers-pack.png"
        alt="Antonelli, Hamilton, Norris, and Verstappen"
        fill
        priority
        quality={92}
        sizes="(min-width: 1024px) 50vw, 0px"
        className="object-contain object-right object-bottom"
      />
    </div>
  );
}
