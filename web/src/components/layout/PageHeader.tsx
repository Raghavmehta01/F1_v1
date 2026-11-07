type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, description, children }: Props) {
  return (
    <header className="max-w-2xl space-y-4">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 className="font-display text-5xl tracking-tight sm:text-6xl">
        {title}
      </h1>
      {description ? (
        <p className="text-lg leading-relaxed text-[var(--muted)]">
          {description}
        </p>
      ) : null}
      {children}
    </header>
  );
}
