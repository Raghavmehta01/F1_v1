"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

type Props = Omit<ImageProps, "src" | "alt"> & {
  src: string | null | undefined;
  alt: string;
  fallback?: React.ReactNode;
};

/** Hides broken F1 CDN assets instead of showing a cracked image. */
export function SafeImage({ src, alt, fallback = null, ...rest }: Props) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <>{fallback}</>;
  return (
    <Image
      {...rest}
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}
