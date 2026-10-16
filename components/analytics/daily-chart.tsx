"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatCost } from "@/lib/pricing";

export interface DayPoint {
  day: string; // YYYY-MM-DD
  replies: number;
  tokensIn: number;
  tokensOut: number;
  costUsd?: number | null; // null: no reply that day had a known price
}

export const compact = (n: number) =>
  n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}K` : String(Math.round(n));

/** Every day in the range, zero-filled, so gaps show as empty columns rather than disappearing. */
export function fillDays(points: DayPoint[], days: number): DayPoint[] {
  const byDay = new Map(points.map((p) => [p.day, p]));
  const out: DayPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    out.push(byDay.get(key) ?? { day: key, replies: 0, tokensIn: 0, tokensOut: 0, costUsd: null });
  }
  return out;
}

// Axis labels for dollars: "$0", "$0.0004", "$1.5", "$1.2K".
const axisCost = (v: number) => (v === 0 ? "$0" : v < 1000 ? `$${+v.toPrecision(3)}` : `$${compact(v)}`);

// Clean axis maximum: four ticks with a round step (1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8 × 10^n).
export function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v / 4));
  const step = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => s * pow * 4 >= v)!;
  return step * pow * 4;
}

const fmtDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

/** Single-series column chart of tokens (or cost) per day, with a per-column hover tooltip. */
export function DailyChart({ data, metric = "tokens" }: { data: DayPoint[]; metric?: "tokens" | "cost" }) {
  const [hover, setHover] = useState<number | null>(null);
  // Draw at the real pixel width so text and bar sizes are true, not scaled.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 220;
  const pad = { top: 12, right: 8, bottom: 26, left: 40 };
  const isCost = metric === "cost";
  const values = data.map((d) => (isCost ? (d.costUsd ?? 0) : d.tokensIn + d.tokensOut));
  // Costs are often fractions of a cent, so pick the axis in units of $0.0001.
  const max = isCost ? niceMax(Math.max(...values, 0) * 1e4) / 1e4 : niceMax(Math.max(...values, 0));
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const slot = plotW / Math.max(data.length, 1);
  const barW = Math.min(24, Math.max(3, slot - 2)); // never fill the slot; ≥2px air between columns
  const y = (v: number) => pad.top + plotH - (v / max) * plotH;
  const labelEvery = Math.ceil(data.length / Math.max(2, Math.floor(plotW / 90)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);

  const tip = useMemo(() => (hover === null ? null : data[hover]), [hover, data]);

  return (
    <div ref={box} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full" role="img" aria-label={isCost ? "Cost per day" : "Tokens per day"}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke="var(--separator)" strokeWidth={1} />
            <text x={pad.left - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted)">
              {isCost ? axisCost(t) : compact(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const v = values[i];
          const x = pad.left + i * slot + (slot - barW) / 2;
          const h = Math.max(0, y(0) - y(v));
          const r = Math.min(4, h / 2, barW / 2);
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* Hit target: the whole column slot, larger than the mark. */}
              <rect x={pad.left + i * slot} y={pad.top} width={slot} height={plotH} fill="transparent" />
              {v > 0 && (
                <path
                  d={`M${x},${y(0)} v${-(h - r)} q0,${-r} ${r},${-r} h${barW - 2 * r} q${r},0 ${r},${r} v${h - r} z`}
                  fill="var(--chart-series)"
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
              {i % labelEvery === 0 && (
                <text x={pad.left + i * slot + slot / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted)">
                  {fmtDay(d.day)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {tip && hover !== null && (
        <div
          role="tooltip"
          className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-lg border border-border bg-overlay px-3 py-2 text-xs shadow-lg"
          // Beside the column (left of it in the right half) so it never covers the hovered bar.
          style={
            pad.left + hover * slot > W / 2
              ? { right: W - (pad.left + hover * slot) + 8 }
              : { left: pad.left + (hover + 1) * slot + 8 }
          }
        >
          <p className="font-medium">{fmtDay(tip.day)}</p>
          <p className="mt-1 flex justify-between gap-4">
            <span className="text-muted-foreground">Tokens in</span>
            <span className="tabular-nums">{tip.tokensIn.toLocaleString()}</span>
          </p>
          <p className="flex justify-between gap-4">
            <span className="text-muted-foreground">Tokens out</span>
            <span className="tabular-nums">{tip.tokensOut.toLocaleString()}</span>
          </p>
          <p className="flex justify-between gap-4">
            <span className="text-muted-foreground">Cost</span>
            <span className="tabular-nums">{formatCost(tip.costUsd)}</span>
          </p>
          <p className="flex justify-between gap-4">
            <span className="text-muted-foreground">Replies</span>
            <span className="tabular-nums">{tip.replies}</span>
          </p>
        </div>
      )}
    </div>
  );
}
