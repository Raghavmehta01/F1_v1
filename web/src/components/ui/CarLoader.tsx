import Image from "next/image";

type Props = {
  /** Full-page route loading vs compact Suspense fallback */
  size?: "page" | "inline";
  label?: string;
};

export function CarLoader({ size = "page", label = "Loading" }: Props) {
  const w = size === "page" ? 180 : 96;
  const h = Math.round(w * 0.33);

  return (
    <div
      className={
        size === "page"
          ? "flex min-h-[55vh] flex-col items-center justify-center gap-5"
          : "flex flex-col items-center justify-center gap-3 py-10"
      }
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="loader-car-spin relative"
        style={{ width: w, height: h }}
      >
        <Image
          src="/ui/loader-car.png"
          alt=""
          fill
          priority
          sizes={`${w}px`}
          className="loader-car-img object-contain object-center"
        />
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
        {label}
        <span className="loader-dots" aria-hidden>
          …
        </span>
      </p>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default function CarLoaderPage() {
  return (
    <div className="page-wrap">
      <CarLoader size="page" />
    </div>
  );
}
