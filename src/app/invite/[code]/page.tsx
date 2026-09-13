import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Avatar, Logo, ScoreBadge } from "@/components/ui";

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const inviter = await db.user.findUnique({ where: { inviteCode: code } });
  if (!inviter) notFound();

  const me = await getCurrentUser();
  if (me) {
    if (me.id !== inviter.id) {
      const existing = await db.friendship.findFirst({
        where: {
          OR: [
            { requesterId: inviter.id, addresseeId: me.id },
            { requesterId: me.id, addresseeId: inviter.id },
          ],
        },
      });
      if (!existing) await db.friendship.create({ data: { requesterId: inviter.id, addresseeId: me.id, status: "accepted" } });
      else if (existing.status !== "accepted") await db.friendship.update({ where: { id: existing.id }, data: { status: "accepted" } });
    }
    redirect(inviter.username ? `/u/${inviter.username}` : "/friends");
  }

  const top = await db.userTrailRank.findMany({ where: { userId: inviter.id }, include: { trail: true }, orderBy: { score: "desc" }, take: 3 });
  const count = await db.userTrailRank.count({ where: { userId: inviter.id } });

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="px-5 py-5">
        <Logo size={24} />
      </header>
      <main className="flex-1 flex items-center justify-center px-5 pb-12">
        <div className="w-full max-w-sm text-center animate-fade-up">
          <Avatar name={inviter.name} src={inviter.avatarUrl} size={80} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight mb-2">{inviter.name} wants to compare hikes with you</h1>
          <p className="text-muted mb-6">
            traili is a friends-only hiking journal. Join and you’ll see {inviter.name.split(" ")[0]}’s {count > 0 ? `${count} ranked hikes` : "list"} — and they’ll see yours.
          </p>
          {top.length > 0 && (
            <ol className="card divide-y divide-line overflow-hidden text-left mb-6">
              {top.map((r, i) => (
                <li key={r.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="w-5 text-sm font-bold text-moss-700 tabular-nums">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{r.trail.name}</div>
                    <div className="text-xs text-muted truncate">{[r.trail.region, r.trail.country].filter(Boolean).join(", ")}</div>
                  </div>
                  <ScoreBadge score={r.score} size="sm" />
                </li>
              ))}
            </ol>
          )}
          <a href={`/api/invite/${code}?to=signup`} className="btn-primary btn-lg w-full">
            Join {inviter.name.split(" ")[0]} on traili
          </a>
          <a href={`/api/invite/${code}?to=login`} className="btn-ghost w-full mt-2">
            I already have an account
          </a>
        </div>
      </main>
    </div>
  );
}
