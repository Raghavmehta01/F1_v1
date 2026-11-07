import { SafeImage } from "@/components/ui/SafeImage";

type Props = {
  src: string | null | undefined;
  accent?: string;
  className?: string;
  sizes?: string;
};

/** Dark-plate team mark — readable in both light and dark themes. */
export function TeamLogoChip({
  src,
  accent,
  className = "h-11 w-11",
  sizes = "44px",
}: Props) {
  return (
    <span
      className={`logo-plate relative flex shrink-0 items-center justify-center overflow-hidden ${className}`}
      style={accent ? { boxShadow: `inset 3px 0 0 ${accent}` } : undefined}
    >
      {src ? (
        <SafeImage
          src={src}
          alt=""
          fill
          sizes={sizes}
          className="object-contain p-1.5"
          fallback={
            accent ? (
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: accent }}
                aria-hidden
              />
            ) : null
          }
        />
      ) : accent ? (
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: accent }}
          aria-hidden
        />
      ) : null}
    </span>
  );
}
