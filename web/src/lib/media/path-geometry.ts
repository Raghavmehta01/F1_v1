/** Polyline helpers for SVG track outlines (M/L only). */

export type Pt = { x: number; y: number };

export type PathCorner = {
  index: number;
  x: number;
  y: number;
  /** Outward-ish label offset from the apex. */
  lx: number;
  ly: number;
  /** Distance along path 0…1. */
  t: number;
  angle: number;
};

function parseNum(s: string): number {
  return Number.parseFloat(s);
}

/** Extract absolute points from an SVG path of M/L commands. */
export function parsePolyline(d: string): Pt[] {
  const pts: Pt[] = [];
  const re = /([MLZmlz])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/g;
  let cmd = "M";
  let token: RegExpExecArray | null;
  const nums: number[] = [];

  const flush = () => {
    while (nums.length >= 2) {
      const x = nums.shift()!;
      const y = nums.shift()!;
      pts.push({ x, y });
    }
    nums.length = 0;
  };

  while ((token = re.exec(d))) {
    if (token[1]) {
      flush();
      cmd = token[1].toUpperCase();
      if (cmd === "Z" && pts.length > 1) {
        const first = pts[0]!;
        const last = pts[pts.length - 1]!;
        if (Math.hypot(first.x - last.x, first.y - last.y) > 0.05) {
          pts.push({ ...first });
        }
      }
    } else if (token[2] != null) {
      nums.push(parseNum(token[2]));
      if ((cmd === "M" || cmd === "L") && nums.length >= 2) {
        pts.push({ x: nums.shift()!, y: nums.shift()! });
      }
    }
  }
  flush();
  return pts;
}

function dist(a: Pt, b: Pt) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function turnAngle(prev: Pt, cur: Pt, next: Pt): number {
  const ax = prev.x - cur.x;
  const ay = prev.y - cur.y;
  const bx = next.x - cur.x;
  const by = next.y - cur.y;
  const la = Math.hypot(ax, ay) || 1;
  const lb = Math.hypot(bx, by) || 1;
  const dot = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)));
  return Math.acos(dot);
}

/**
 * Find high-curvature vertices as turn candidates.
 * Labels are nudged away from the track centroid.
 */
export function findPathCorners(
  d: string,
  opts: { minAngleDeg?: number; minSpacing?: number; maxTurns?: number } = {},
): PathCorner[] {
  const minAngle = ((opts.minAngleDeg ?? 28) * Math.PI) / 180;
  const minSpacing = opts.minSpacing ?? 4.5;
  const maxTurns = opts.maxTurns ?? 22;
  const pts = parsePolyline(d);
  if (pts.length < 4) return [];

  let cx = 0;
  let cy = 0;
  for (const p of pts) {
    cx += p.x;
    cy += p.y;
  }
  cx /= pts.length;
  cy /= pts.length;

  const lengths: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    lengths.push(lengths[i - 1]! + dist(pts[i - 1]!, pts[i]!));
  }
  const total = lengths[lengths.length - 1]! || 1;

  type Cand = { i: number; angle: number };
  const cands: Cand[] = [];
  const n = pts.length;
  const closed =
    dist(pts[0]!, pts[n - 1]!) < 0.8 ||
    (pts[0]!.x === pts[n - 1]!.x && pts[0]!.y === pts[n - 1]!.y);
  const last = closed ? n - 2 : n - 2;

  for (let i = 1; i <= last; i++) {
    const prev = pts[i - 1]!;
    const cur = pts[i]!;
    const next = pts[i + 1] ?? pts[1]!;
    const angle = turnAngle(prev, cur, next);
    if (angle >= minAngle) cands.push({ i, angle });
  }

  cands.sort((a, b) => b.angle - a.angle);

  const picked: Cand[] = [];
  for (const c of cands) {
    if (picked.length >= maxTurns) break;
    const p = pts[c.i]!;
    if (
      picked.some((q) => {
        const r = pts[q.i]!;
        return Math.hypot(p.x - r.x, p.y - r.y) < minSpacing;
      })
    ) {
      continue;
    }
    picked.push(c);
  }

  picked.sort((a, b) => lengths[a.i]! - lengths[b.i]!);

  return picked.map((c) => {
    const p = pts[c.i]!;
    const vx = p.x - cx;
    const vy = p.y - cy;
    const len = Math.hypot(vx, vy) || 1;
    const push = 3.6;
    return {
      index: c.i,
      x: p.x,
      y: p.y,
      lx: p.x + (vx / len) * push,
      ly: p.y + (vy / len) * push,
      t: lengths[c.i]! / total,
      angle: c.angle,
    };
  });
}

export function pointAtFraction(d: string, t: number): Pt | null {
  const pts = parsePolyline(d);
  if (pts.length < 2) return null;
  const lengths: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    lengths.push(lengths[i - 1]! + dist(pts[i - 1]!, pts[i]!));
  }
  const total = lengths[lengths.length - 1]!;
  if (total <= 0) return pts[0] ?? null;
  const target = Math.max(0, Math.min(1, t)) * total;
  for (let i = 1; i < pts.length; i++) {
    if (lengths[i]! >= target) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      const seg = lengths[i]! - lengths[i - 1]!;
      const u = seg > 0 ? (target - lengths[i - 1]!) / seg : 0;
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
    }
  }
  return pts[pts.length - 1] ?? null;
}
