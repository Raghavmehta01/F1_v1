"use client";

import { SafeImage } from "@/components/ui/SafeImage";

type Props = {
  src: string | null | undefined;
  alt: string;
  accent?: string;
  className?: string;
  /** Extra classes on the <Image> (object-position etc). */
  imgClassName?: string;
  priority?: boolean;
  sizes?: string;
};

/** Full-bleed portrait with accent bar + graceful CDN failure. */
export function DriverPortrait({
  src,
  alt,
  accent,
  className = "",
  imgClassName = "",
  priority = false,
  sizes = "72px",
}: Props) {
  return (
    <span
      className={`relative block overflow-hidden bg-[var(--bg-elevated)] ${className}`}
    >
      <SafeImage
        src={src}
        alt={alt}
        fill
        priority={priority}
        quality={92}
        // 2026 Cloudinary *right.webp assets pin the driver on the right —
        // center crops chop the suit / shoulder.
        className={`portrait-hover object-cover object-[68%_top] ${imgClassName}`}
        sizes={sizes}
        fallback={
          <span className="absolute inset-0 flex items-center justify-center font-mono text-sm text-[var(--muted)]">
            {alt
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0])
              .join("")
              .toUpperCase()}
          </span>
        }
      />
      {accent ? (
        <span
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ background: accent }}
          aria-hidden
        />
      ) : null}
    </span>
  );
}
