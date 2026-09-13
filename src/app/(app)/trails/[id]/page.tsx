import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Footprints, Mountain, Navigation, Plus, Repeat, Route } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getFriendIds, getRankPosition } from "@/lib/queries";
import { fmtDistance, fmtGain, parseJsonArray } from "@/lib/format";
import { EFFORT } from "@/lib/constants";
import WantButton from "@/components/WantButton";
import VisitCard from "@/components/VisitCard";
import TrailStatsEditor from "@/components/TrailStatsEditor";
import { Avatar, KindBadge, ScoreBadge } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trail = await db.trail.findUnique({ where: { id }, select: { name: true } });
  return { title: trail?.name ?? "Trail" };
}

export default async function TrailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ logged?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { logged } = await searchParams;
  const trail = await db.trail.findUnique({ where: { id } });
  if (!trail) notFound();

  const friendIds = await getFriendIds(user.id);
  const [myRank, want, myVisits, friendRanks, photos] = await Promise.all([
    getRankPosition(user.id, trail.id),
    db.want.findUnique({ where: { userId_trailId: { userId: user.id, trailId: trail.id } } }),
    db.visit.findMany({ where: { userId: user.id, trailId: trail.id }, include: { photos: true }, orderBy: { date: "desc" } }),
    db.userTrailRank.findMany({
      where: { trailId: trail.id, userId: { in: friendIds } },
      include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } },
      orderBy: { score: "desc" },
    }),
    db.photo.findMany({ where: { trailId: trail.id, userId: { in: [user.id, ...friendIds] } }, orderBy: { createdAt: "desc" }, take: 12 }),
  ]);

  const place = [trail.region, trail.country].filter(Boolean).join(", ");
  const effort = EFFORT.find((e) => e.id === trail.difficulty)?.label;
  const routeLabel = trail.routeType === "loop" ? "Loop" : trail.routeType === "out-and-back" ? "Out & back" : trail.routeType === "point-to-point" ? "Point to point" : null;
  const bbox = [trail.lng - 0.03, trail.lat - 0.02, trail.lng + 0.03, trail.lat + 0.02].join(",");
  const osmUrl = trail.osmType && trail.osmId ? `https://www.openstreetmap.org/${trail.osmType}/${trail.osmId}` : `https://www.openstreetmap.org/?mlat=${trail.lat}&mlon=${trail.lng}#map=14/${trail.lat}/${trail.lng}`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${trail.lat},${trail.lng}`;
  const alltrails = `https://www.alltrails.com/search?q=${encodeURIComponent(trail.name)}`;

  return (
    <div className="animate-fade-up">
      <Link href="/lists" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink mb-3 md:hidden">
        <ArrowLeft size={16} /> Back
      </Link>

      {logged && myRank && (
        <div className="rounded-2xl bg-moss-50 border border-moss-200 px-4 py-3 mb-4 text-sm flex items-center gap-3">
          <ScoreBadge score={myRank.item.score} size="sm" />
          <span>
            Logged. It’s <span className="font-semibold">#{myRank.position}</span> of {myRank.total} on your list.
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <KindBadge kind={trail.kind} />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">{trail.name}</h1>
          {place && <p className="text-muted mt-0.5">{place}</p>}
        </div>
        {myRank && (
          <div className="text-right shrink-0">
            <ScoreBadge score={myRank.item.score} size="lg" />
            <div className="text-xs text-muted mt-1">
              #{myRank.position} of {myRank.total}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-700 mb-3">
        {trail.distanceKm != null && (
          <span className="inline-flex items-center gap-1.5">
            <Footprints size={15} className="text-muted" /> {fmtDistance(trail.distanceKm)}
          </span>
        )}
        {trail.elevationGainM != null && (
          <span className="inline-flex items-center gap-1.5">
            <Mountain size={15} className="text-muted" /> {fmtGain(trail.elevationGainM)} gain
          </span>
        )}
        {effort && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-moss-500" /> {effort}
          </span>
        )}
        {routeLabel && (
          <span className="inline-flex items-center gap-1.5">
            <Route size={15} className="text-muted" /> {routeLabel}
          </span>
        )}
      </div>
      {trail.description && <p className="text-sm text-stone-700 mb-3">{trail.description}</p>}
      <div className="mb-5">
        <TrailStatsEditor trailId={trail.id} distanceKm={trail.distanceKm} elevationGainM={trail.elevationGainM} difficulty={trail.difficulty} routeType={trail.routeType} description={trail.description} />
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-5">
        <Link href={`/log?trail=${trail.id}`} className="btn-primary flex-1">
          {myRank ? <Repeat size={16} /> : <Plus size={16} />}
          {myRank ? "Hiked it again" : "I’ve done this"}
        </Link>
        {!myRank && <WantButton trailId={trail.id} initial={Boolean(want)} />}
      </div>

      {/* Map */}
      <div className="card overflow-hidden mb-5">
        <iframe
          title="Map"
          className="w-full h-52 md:h-64 block"
          loading="lazy"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${trail.lat},${trail.lng}`}
        />
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
          <a href={directions} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-moss-700 font-medium">
            <Navigation size={14} /> Directions
          </a>
          <a href={osmUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-muted hover:text-ink">
            <ExternalLink size={14} /> OpenStreetMap
          </a>
          <a href={alltrails} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-muted hover:text-ink">
            <ExternalLink size={14} /> AllTrails
          </a>
        </div>
      </div>

      {/* Friends */}
      <section className="mb-6">
        <h2 className="font-semibold mb-2">Friends who’ve been</h2>
        {friendRanks.length === 0 ? (
          <p className="text-sm text-muted">None of your friends have ranked this yet.{myRank ? " You’re the scout." : ""}</p>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {friendRanks.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <Link href={r.user.username ? `/u/${r.user.username}` : "#"} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar name={r.user.name} src={r.user.avatarUrl} size={36} />
                  <span className="font-medium truncate">{r.user.name}</span>
                </Link>
                <ScoreBadge score={r.score} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Photos from you + friends */}
      {photos.length > 0 && (
        <section className="mb-6">
          <h2 className="font-semibold mb-2">Photos</h2>
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={`/api/uploads/${p.file}`} alt="" className="aspect-square w-full rounded-xl object-cover bg-stone-100" />
            ))}
          </div>
        </section>
      )}

      {/* Your visits */}
      <section>
        <h2 className="font-semibold mb-2">Your visits</h2>
        {myVisits.length === 0 ? (
          <p className="text-sm text-muted">You haven’t logged this one yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {myVisits.map((v) => (
              <VisitCard
                key={v.id}
                editable
                visit={{
                  id: v.id,
                  date: v.date.toISOString(),
                  notes: v.notes,
                  conditions: parseJsonArray(v.conditions),
                  companions: parseJsonArray(v.companions),
                  crowd: v.crowd,
                  wouldRepeat: v.wouldRepeat,
                  photos: v.photos.map((p) => ({ id: p.id, url: `/api/uploads/${p.file}` })),
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
