import Link from "next/link";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { getFriendIds } from "@/lib/queries";
import { requestAppUrl } from "@/lib/google";
import UserSearch from "@/components/UserSearch";
import InviteLink from "@/components/InviteLink";
import FriendButton from "@/components/FriendButton";
import { Avatar } from "@/components/ui";

export const metadata = { title: "Friends" };

export default async function FriendsPage() {
  const user = await requireUser();
  const friendIds = await getFriendIds(user.id);
  const [friends, incoming, outgoing] = await Promise.all([
    db.user.findMany({ where: { id: { in: friendIds } }, include: { _count: { select: { ranks: true } } }, orderBy: { name: "asc" } }),
    db.friendship.findMany({ where: { addresseeId: user.id, status: "pending" }, include: { requester: true }, orderBy: { createdAt: "desc" } }),
    db.friendship.findMany({ where: { requesterId: user.id, status: "pending" }, include: { addressee: true }, orderBy: { createdAt: "desc" } }),
  ]);

  const Row = ({ u, right }: { u: { id: string; name: string; username: string | null; avatarUrl: string | null; homePlace?: string | null }; right: React.ReactNode }) => (
    <li className="flex items-center gap-3 px-3.5 py-3">
      <Link href={u.username ? `/u/${u.username}` : "#"} className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar name={u.name} src={u.avatarUrl} size={40} />
        <div className="min-w-0">
          <div className="font-semibold truncate">{u.name}</div>
          <div className="text-sm text-muted truncate">
            {u.username ? `@${u.username}` : ""}
            {u.homePlace ? ` · ${u.homePlace}` : ""}
          </div>
        </div>
      </Link>
      {right}
    </li>
  );

  return (
    <div className="animate-fade-up">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Friends</h1>
      <p className="text-sm text-muted mb-4">Your feed and trail pages only show people here.</p>

      <UserSearch />

      {incoming.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold mb-2">Requests</h2>
          <ul className="card divide-y divide-line overflow-hidden">
            {incoming.map((f) => (
              <Row key={f.id} u={f.requester} right={<FriendButton userId={f.requesterId} initial="incoming" compact />} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-semibold mb-2">
          {friends.length} {friends.length === 1 ? "friend" : "friends"}
        </h2>
        {friends.length === 0 ? (
          <p className="text-sm text-muted mb-3">Nobody yet. Search above, or send your invite link.</p>
        ) : (
          <ul className="card divide-y divide-line overflow-hidden">
            {friends.map((f) => (
              <Row key={f.id} u={f} right={<span className="text-sm text-muted tabular-nums">{f._count.ranks} hikes</span>} />
            ))}
          </ul>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold mb-2">Sent</h2>
          <ul className="card divide-y divide-line overflow-hidden">
            {outgoing.map((f) => (
              <Row key={f.id} u={f.addressee} right={<FriendButton userId={f.addresseeId} initial="outgoing" compact />} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <InviteLink url={`${await requestAppUrl()}/invite/${user.inviteCode}`} />
      </section>
    </div>
  );
}
