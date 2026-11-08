"use client";

import { SafeImage } from "@/components/ui/SafeImage";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type BattleDriver = {
  id: string;
  name: string;
  code: string;
  points: string;
  wins: string;
  position: string;
  constructorName?: string;
  shot: string | null;
};

export function BattlePanel({
  drivers,
  initialA,
  initialB,
  season,
}: {
  drivers: BattleDriver[];
  initialA?: string;
  initialB?: string;
  season: string;
}) {
  const router = useRouter();
  const [aId, setAId] = useState(initialA ?? drivers[0]?.id ?? "");
  const [bId, setBId] = useState(initialB ?? drivers[1]?.id ?? "");

  const a = useMemo(() => drivers.find((d) => d.id === aId), [drivers, aId]);
  const b = useMemo(() => drivers.find((d) => d.id === bId), [drivers, bId]);

  function sync(nextA: string, nextB: string) {
    setAId(nextA);
    setBId(nextB);
    const q = new URLSearchParams({ season, a: nextA, b: nextB });
    router.replace(`/battle?${q.toString()}`, { scroll: false });
  }

  if (!a || !b) {
    return (
      <p className="text-[var(--muted)]">Need at least two drivers in standings.</p>
    );
  }

  const rows: Array<{ label: string; av: string; bv: string; aWins: boolean | null }> = [
    {
      label: "Championship pos",
      av: `P${a.position}`,
      bv: `P${b.position}`,
      aWins: Number(a.position) < Number(b.position),
    },
    {
      label: "Points",
      av: a.points,
      bv: b.points,
      aWins: Number(a.points) > Number(b.points),
    },
    {
      label: "Wins",
      av: a.wins,
      bv: b.wins,
      aWins: Number(a.wins) === Number(b.wins) ? null : Number(a.wins) > Number(b.wins),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
          Driver A
          <select
            className="border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 font-mono text-xs text-[var(--ink)]"
            value={aId}
            onChange={(e) => sync(e.target.value, bId === e.target.value ? aId : bId)}
          >
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} · {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
          Driver B
          <select
            className="border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 font-mono text-xs text-[var(--ink)]"
            value={bId}
            onChange={(e) => sync(aId === e.target.value ? bId : aId, e.target.value)}
          >
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} · {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-6 border border-[var(--line)] bg-[var(--bg-elevated)] p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:p-8">
        <DriverCard d={a} align="left" />
        <p className="text-center font-display text-3xl text-[var(--brand)]">VS</p>
        <DriverCard d={b} align="right" />
      </div>

      <div className="divide-y divide-[var(--line)] border border-[var(--line)]">
        {rows.map((r) => (
          <div
            key={r.label}
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3 sm:px-6"
          >
            <p
              className={`font-mono text-sm ${
                r.aWins === true ? "text-[var(--gain)]" : "text-[var(--ink)]"
              } text-left`}
            >
              {r.av}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              {r.label}
            </p>
            <p
              className={`font-mono text-sm ${
                r.aWins === false ? "text-[var(--gain)]" : "text-[var(--ink)]"
              } text-right`}
            >
              {r.bv}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DriverCard({
  d,
  align,
}: {
  d: BattleDriver;
  align: "left" | "right";
}) {
  return (
    <div className={`flex items-center gap-4 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-[var(--hero-media-plate)] sm:h-28 sm:w-24">
        {d.shot ? (
          <SafeImage src={d.shot} alt={d.name} fill className="object-cover object-top" sizes="96px" />
        ) : null}
      </div>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
          {d.code} · P{d.position}
        </p>
        <p className="font-display text-xl tracking-tight sm:text-2xl">{d.name}</p>
        <p className="text-sm text-[var(--muted)]">{d.constructorName}</p>
      </div>
    </div>
  );
}
