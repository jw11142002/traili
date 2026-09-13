import Link from "next/link";
import { Mountain } from "lucide-react";
import { formatScore, scoreTone } from "@/lib/ranking";
import { initials } from "@/lib/format";
import type { TrailKind } from "@/lib/trails";
import { KIND_LABEL } from "@/lib/trails";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.38) };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} style={style} className={cx("rounded-full object-cover bg-stone-100 shrink-0", className)} />;
  }
  return (
    <div
      style={style}
      className={cx("rounded-full bg-moss-100 text-moss-800 font-semibold flex items-center justify-center shrink-0", className)}
      aria-label={name}
    >
      {initials(name) || "?"}
    </div>
  );
}

const TONE_CLASSES = {
  liked: "bg-moss-600 text-white",
  fine: "bg-amber-500 text-white",
  disliked: "bg-rust-500 text-white",
};

export function ScoreBadge({ score, size = "md", className }: { score: number; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const tone = scoreTone(score);
  const sizes = {
    sm: "h-7 min-w-7 px-1.5 text-xs rounded-lg",
    md: "h-9 min-w-9 px-2 text-sm rounded-xl",
    lg: "h-12 min-w-12 px-2.5 text-lg rounded-2xl",
    xl: "h-20 min-w-20 px-4 text-3xl rounded-3xl",
  };
  return (
    <span className={cx("inline-flex items-center justify-center font-bold tabular-nums shrink-0", TONE_CLASSES[tone], sizes[size], className)}>
      {formatScore(score)}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx("inline-block h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-moss-600", className)}
      aria-label="Loading"
    />
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card p-8 text-center flex flex-col items-center gap-2">
      <div className="text-moss-600 mb-1">{icon ?? <Mountain size={28} />}</div>
      <h3 className="font-semibold text-ink">{title}</h3>
      {body && <p className="text-sm text-muted max-w-xs">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function KindBadge({ kind }: { kind?: string | null }) {
  const k = (kind ?? "trail") as TrailKind;
  return <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">{KIND_LABEL[k] ?? "Trail"}</span>;
}

export function TrailThumb({ photo, kind, size = 48, className }: { photo?: string | null; kind?: string | null; size?: number; className?: string }) {
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" style={{ width: size, height: size }} className={cx("rounded-xl object-cover bg-stone-100 shrink-0", className)} />;
  }
  const glyph = kind === "peak" ? "⛰️" : kind === "lake" ? "🏞️" : kind === "waterfall" ? "💧" : kind === "park" ? "🌲" : kind === "viewpoint" ? "🔭" : kind === "hut" ? "🛖" : "🥾";
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={cx("rounded-xl bg-moss-50 flex items-center justify-center shrink-0", className)}
      aria-hidden
    >
      {glyph}
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Logo({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <Link href="/" className={cx("inline-flex items-center gap-1.5 font-bold tracking-tight text-moss-800", className)}>
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-moss-600 text-white">
        <Mountain size={size * 0.75} strokeWidth={2.5} />
      </span>
      <span style={{ fontSize: size }}>traili</span>
    </Link>
  );
}
