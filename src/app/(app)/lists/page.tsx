import Link from "next/link";
import { Plus, Bookmark } from "lucide-react";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { getFriendIds, getRankedList } from "@/lib/queries";
import RankedList from "@/components/RankedList";
import WantList from "@/components/WantList";
import { EmptyState } from "@/components/ui";

export const metadata = { title: "Your lists" };

export default async function ListsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser();
  const { tab = "been" } = await searchParams;

  const tabs = (
    <div className="flex rounded-xl border border-line bg-white p-1 mb-4 w-fit">
      {[
        ["been", "Been"],
        ["want", "Want to hike"],
      ].map(([id, label]) => (
        <Link key={id} href={`/lists?tab=${id}`} className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${tab === id ? "bg-moss-600 text-white" : "text-stone-600 hover:bg-stone-50"}`}>
          {label}
        </Link>
      ))}
    </div>
  );

  if (tab === "want") {
    const friendIds = await getFriendIds(user.id);
    const wants = await db.want.findMany({
      where: { userId: user.id },
      include: {
        trail: {
          include: {
            photos: { take: 1, orderBy: { createdAt: "desc" } },
            ranks: { where: { userId: { in: friendIds } }, include: { user: { select: { name: true } } }, orderBy: { score: "desc" } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return (
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight mb-3">Your lists</h1>
        {tabs}
        {wants.length === 0 ? (
          <EmptyState
            icon={<Bookmark size={28} />}
            title="No hikes saved yet"
            body="Tap “Want to hike” on any trail. Friends’ favorites you haven’t done show up on your home feed."
            action={
              <Link href="/search" className="btn-primary">
                Find a trail
              </Link>
            }
          />
        ) : (
          <WantList
            rows={wants.map((w) => ({
              id: w.id,
              trailId: w.trailId,
              name: w.trail.name,
              region: w.trail.region,
              country: w.trail.country,
              kind: w.trail.kind,
              distanceKm: w.trail.distanceKm,
              note: w.note,
              photo: w.trail.photos[0] ? `/api/uploads/${w.trail.photos[0].file}` : null,
              friends: w.trail.ranks.map((r) => ({ name: r.user.name.split(" ")[0], score: r.score })),
            }))}
          />
        )}
      </div>
    );
  }

  const ranks = await getRankedList(user.id);
  return (
    <div className="animate-fade-up">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your lists</h1>
          <p className="text-sm text-muted">{ranks.length} ranked {ranks.length === 1 ? "hike" : "hikes"}</p>
        </div>
        <Link href="/log" className="btn-primary px-3 py-2 text-sm">
          <Plus size={16} /> Log
        </Link>
      </div>
      {tabs}
      {ranks.length === 0 ? (
        <EmptyState
          title="Your list starts with one hike"
          body="Search a trail you’ve done, tell us how it felt, and it’s ranked."
          action={
            <Link href="/log" className="btn-primary">
              <Plus size={16} /> Log a hike
            </Link>
          }
        />
      ) : (
        <RankedList
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
