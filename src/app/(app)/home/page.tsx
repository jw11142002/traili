import Link from "next/link";
import { Users, Plus } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getFeed, getFriendIds, getFriendRecommendations } from "@/lib/queries";
import { requestAppUrl } from "@/lib/google";
import FeedItem from "@/components/FeedItem";
import InviteLink from "@/components/InviteLink";
import { Avatar, EmptyState, ScoreBadge, TrailThumb } from "@/components/ui";

export const metadata = { title: "Home" };

export default async function HomePage() {
  const user = await requireUser();
  const [feed, friendIds, recs] = await Promise.all([getFeed(user.id), getFriendIds(user.id), getFriendRecommendations(user.id, 10)]);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hey {firstName}</h1>
          <p className="text-sm text-muted">{friendIds.length === 0 ? "Your feed is waiting for friends." : `What ${friendIds.length === 1 ? "your friend has" : "your friends have"} been up to.`}</p>
        </div>
        <Link href="/log" className="btn-primary hidden md:inline-flex">
          <Plus size={16} /> Log a hike
        </Link>
      </div>

      {friendIds.length === 0 && (
        <div className="card p-5 mb-5 bg-moss-50/60 border-moss-200">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-white text-moss-700 flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div className="flex-1">
              <div className="font-semibold">traili is better with friends</div>
              <p className="text-sm text-stone-600 mt-0.5 mb-3">Send your link to the people you hike with. Anyone who joins through it is added automatically.</p>
              <InviteLink url={`${await requestAppUrl()}/invite/${user.inviteCode}`} compact />
              <Link href="/friends" className="text-sm font-semibold text-moss-700 inline-block mt-3">
                Or search for someone already here →
              </Link>
            </div>
          </div>
        </div>
      )}

      {recs.length > 0 && (
        <section className="mb-6">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="font-semibold">Friends’ favorites you haven’t done</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
            {recs.map((r) => (
              <Link key={r.trail.id} href={`/trails/${r.trail.id}`} className="card w-44 shrink-0 p-3 hover:border-moss-400">
                <TrailThumb photo={r.trail.photos[0] ? `/api/uploads/${r.trail.photos[0].file}` : null} kind={r.trail.kind} size={152} className="w-full h-24 mb-2" />
                <div className="font-semibold text-sm leading-tight truncate">{r.trail.name}</div>
                <div className="text-xs text-muted truncate">{[r.trail.region, r.trail.country].filter(Boolean).join(", ")}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex -space-x-1.5">
                    {r.fans.slice(0, 3).map((f) => (
                      <Avatar key={f.id} name={f.name} src={f.avatarUrl} size={22} className="ring-2 ring-white" />
                    ))}
                  </div>
                  <ScoreBadge score={r.avg} size="sm" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {feed.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          body="Log a hike and it shows up here — and on your friends’ feeds."
          action={
            <Link href="/log" className="btn-primary">
              <Plus size={16} /> Log your first hike
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {feed.map((item) => (
            <FeedItem key={item.id} item={item} meId={user.id} />
          ))}
        </div>
      )}
    </div>
  );
}
