import Link from "next/link";
import { notFound } from "next/navigation";
import { Settings, MapPin, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getFriendState, getRankedList, getUserStats } from "@/lib/queries";
import { kmToMi, mToFt, parseJsonArray } from "@/lib/format";
import { TASTES } from "@/lib/constants";
import FriendButton from "@/components/FriendButton";
import RankedList from "@/components/RankedList";
import { Avatar, EmptyState, ScoreBadge, TrailThumb } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const u = await db.user.findUnique({ where: { username }, select: { name: true } });
  return { title: u ? `${u.name} (@${username})` : "Profile" };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const me = await requireUser();
  const { username } = await params;
  const user = await db.user.findUnique({ where: { username } });
  if (!user) notFound();

  const [state, stats, ranks] = await Promise.all([getFriendState(me.id, user.id), getUserStats(user.id), getRankedList(user.id)]);
  const isSelf = state === "self";
  const canSee = isSelf || state === "friends";
  const tastes = parseJsonArray(user.tastes).map((t) => TASTES.find((x) => x.id === t)).filter(Boolean) as (typeof TASTES)[number][];

  return (
    <div className="animate-fade-up">
      <div className="flex items-start gap-4 mb-4">
        <Avatar name={user.name} src={user.avatarUrl} size={72} />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight leading-tight truncate">{user.name}</h1>
          <div className="text-muted text-sm">@{user.username}</div>
          {user.homePlace && (
            <div className="text-sm text-stone-600 mt-1 inline-flex items-center gap-1">
              <MapPin size={13} /> {user.homePlace}
            </div>
          )}
        </div>
        {isSelf ? (
          <Link href="/settings" className="btn-secondary px-3 py-2 text-sm">
            <Settings size={16} /> Edit
          </Link>
        ) : (
          <FriendButton userId={user.id} initial={state} compact />
        )}
      </div>
      {user.bio && <p className="text-[15px] mb-4">{user.bio}</p>}
      {tastes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {tastes.map((t) => (
            <span key={t.id} className="rounded-full bg-moss-50 text-moss-800 px-2.5 py-1 text-xs font-medium">
              {t.emoji} {t.label}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 mb-6">
        {[
          [stats.hikes, "hikes"],
          [Math.round(kmToMi(stats.distanceKm)).toLocaleString(), "miles"],
          [Math.round(mToFt(stats.gainM)).toLocaleString(), "ft gain"],
          [stats.countries, stats.countries === 1 ? "country" : "countries"],
        ].map(([v, l]) => (
          <div key={String(l)} className="card px-2 py-3 text-center">
            <div className="text-lg font-bold tabular-nums leading-none">{v}</div>
            <div className="text-[11px] text-muted mt-1">{l}</div>
          </div>
        ))}
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <h2 className="font-semibold">{isSelf ? "Your ranked hikes" : `${user.name.split(" ")[0]}’s ranked hikes`}</h2>
        {isSelf && ranks.length > 0 && (
          <Link href="/lists" className="text-sm font-medium text-moss-700">
            Edit list
          </Link>
        )}
      </div>

      {!canSee ? (
        <div>
          {ranks.length > 0 && (
            <ol className="card divide-y divide-line overflow-hidden mb-3">
              {ranks.slice(0, 3).map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="w-5 text-sm font-bold text-moss-700 tabular-nums">{r.position}</span>
                  <TrailThumb kind={r.trail.kind} photo={r.trail.photos[0] ? `/api/uploads/${r.trail.photos[0].file}` : null} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{r.trail.name}</div>
                    <div className="text-xs text-muted truncate">{[r.trail.region, r.trail.country].filter(Boolean).join(", ")}</div>
                  </div>
                  <ScoreBadge score={r.score} size="sm" />
                </li>
              ))}
            </ol>
          )}
          <EmptyState icon={<Lock size={24} />} title="Friends only" body={`Add ${user.name.split(" ")[0]} as a friend to see their full list, visits, and photos.`} action={<FriendButton userId={user.id} initial={state} />} />
        </div>
      ) : ranks.length === 0 ? (
        <EmptyState title={isSelf ? "No hikes ranked yet" : "Nothing ranked yet"} body={isSelf ? "Log your first hike to start your list." : undefined} action={isSelf ? <Link href="/log" className="btn-primary">Log a hike</Link> : undefined} />
      ) : (
        <RankedList
          editable={false}
          rows={ranks.map((r) => ({
            id: r.id,
            trailId: r.trailId,
            name: r.trail.name,
            region: r.trail.region,
            country: r.trail.country,
            kind: r.trail.kind,
            difficulty: r.trail.difficulty,
            distanceKm: r.trail.distanceKm,
            score: r.score,
            photo: r.trail.photos[0] ? `/api/uploads/${r.trail.photos[0].file}` : null,
          }))}
        />
      )}
    </div>
  );
}
