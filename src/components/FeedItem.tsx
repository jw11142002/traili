import Link from "next/link";
import { Bookmark, Repeat, Sparkles } from "lucide-react";
import type { getFeed } from "@/lib/queries";
import { fmtDate, parseJsonArray, timeAgo } from "@/lib/format";
import { CONDITIONS } from "@/lib/constants";
import { Avatar, ScoreBadge } from "./ui";

type Item = Awaited<ReturnType<typeof getFeed>>[number];

export default function FeedItem({ item, meId }: { item: Item; meId: string }) {
  const meta = (item.meta ? JSON.parse(item.meta) : {}) as { score?: number; position?: number; total?: number };
  const who = item.user.id === meId ? "You" : item.user.name;
  const profile = item.user.username ? `/u/${item.user.username}` : "#";
  const trailLink = item.trail ? (
    <Link href={`/trails/${item.trail.id}`} className="font-semibold hover:underline underline-offset-2">
      {item.trail.name}
    </Link>
  ) : null;

  let verb: React.ReactNode = null;
  let icon: React.ReactNode = null;
  switch (item.type) {
    case "ranked":
      verb = <>ranked {trailLink}</>;
      break;
    case "reranked":
      verb = <>re-ranked {trailLink}</>;
      icon = <Repeat size={14} className="text-muted" />;
      break;
    case "revisited":
      verb = <>hiked {trailLink} again</>;
      icon = <Repeat size={14} className="text-muted" />;
      break;
    case "wanted":
      verb = <>wants to hike {trailLink}</>;
      icon = <Bookmark size={14} className="text-clay-500" fill="currentColor" />;
      break;
    case "joined":
      verb = <>joined traili</>;
      icon = <Sparkles size={14} className="text-moss-600" />;
      break;
  }

  const conditions = parseJsonArray(item.visit?.conditions).map((c) => CONDITIONS.find((x) => x.id === c)?.label ?? c);
  const place = item.trail ? [item.trail.region, item.trail.country].filter(Boolean).join(", ") : null;

  return (
    <article className="card p-4">
      <div className="flex items-start gap-3">
        <Link href={profile}>
          <Avatar name={item.user.name} src={item.user.avatarUrl} size={40} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] leading-snug">
            <Link href={profile} className="font-semibold hover:underline underline-offset-2">
              {who}
            </Link>{" "}
            {verb}
          </div>
          <div className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
            {icon}
            {place && <span>{place} · </span>}
            <span>{timeAgo(item.createdAt)}</span>
          </div>
        </div>
        {meta.score != null && (item.type === "ranked" || item.type === "reranked" || item.type === "revisited") && (
          <div className="flex flex-col items-end gap-0.5">
            <ScoreBadge score={meta.score} />
            {meta.position != null && <span className="text-[11px] text-muted">#{meta.position}{meta.total ? ` of ${meta.total}` : ""}</span>}
          </div>
        )}
      </div>

      {item.visit && (item.visit.notes || item.visit.photos.length > 0 || conditions.length > 0) && (
        <div className="mt-3 pl-[52px]">
          {item.visit.photos.length > 0 && (
            <div className={`grid gap-1.5 mb-2 ${item.visit.photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {item.visit.photos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={`/api/uploads/${p.file}`} alt="" className={`w-full rounded-xl object-cover bg-stone-100 ${item.visit!.photos.length === 1 ? "max-h-72" : "aspect-[4/3]"}`} />
              ))}
            </div>
          )}
          {item.visit.notes && <p className="text-[15px] text-stone-800 whitespace-pre-line">{item.visit.notes}</p>}
          <div className="flex flex-wrap gap-1.5 mt-2 text-xs text-muted">
            <span>{fmtDate(item.visit.date)}</span>
            {conditions.map((c) => (
              <span key={c} className="rounded-full bg-stone-100 px-2 py-0.5">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
