"use client";

import { SafeImage } from "@/components/ui/SafeImage";
import { fullDriverImage, type DriverMediaInput } from "@/lib/media";

type Props = {
  src: string | DriverMediaInput | null | undefined;
  alt: string;
  size?: number;
  teamHex?: string | null;
  className?: string;
  priority?: boolean;
};

function initials(alt: string) {
  const parts = alt.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  return alt.slice(0, 2).toUpperCase();
}

export function DriverAvatar({
  src,
  alt,
  size = 40,
  teamHex,
  className = "",
  priority = false,
}: Props) {
  const accent = teamHex ? `#${teamHex.replace(/^#/, "")}` : "var(--line)";
  const imageSrc =
    typeof src === "string"
      ? (fullDriverImage(src) ?? src)
      : fullDriverImage(src);
  const sourceSize = Math.max(size * 3, 180);

  const fallback = (
    <span
      className="flex h-full w-full items-center justify-center bg-[var(--bg-elevated)] font-mono text-[0.65em] tracking-wider text-[var(--muted)]"
      style={{ fontSize: Math.max(11, size * 0.28) }}
      aria-hidden
    >
      {initials(alt)}
    </span>
  );

  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden bg-[var(--bg-soft)] ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: `inset 3px 0 0 ${accent}`,
      }}
    >
      {imageSrc ? (
        <SafeImage
          src={imageSrc}
          alt={alt}
          width={sourceSize}
          height={sourceSize}
          quality={92}
          priority={priority}
          className="portrait-hover h-full w-full object-cover object-[68%_top]"
          sizes={`${size * 2}px`}
          fallback={fallback}
        />
      ) : (
        fallback
      )}
    </span>
  );
}
