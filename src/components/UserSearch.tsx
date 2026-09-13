"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { searchUsers, type UserCard } from "@/lib/actions/social";
import FriendButton from "./FriendButton";
import { Avatar, Spinner } from "./ui";

export default function UserSearch({ autoFocus, placeholder }: { autoFocus?: boolean; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      const r = await searchUsers(q);
      if (id !== reqId.current) return;
      setResults(r);
      setSearched(true);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder ?? "Search by name, @username, or email"} className="input pl-10" autoFocus={autoFocus} autoComplete="off" />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Spinner />
          </div>
        )}
      </div>
      {results.length > 0 && (
        <ul className="mt-3 card divide-y divide-line overflow-hidden">
          {results.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-3.5 py-3">
              <Link href={u.username ? `/u/${u.username}` : "#"} className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar name={u.name} src={u.avatarUrl} size={40} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">{u.name}</div>
                  <div className="text-sm text-muted truncate">
                    {u.username ? `@${u.username}` : ""}
                    {u.hikes > 0 && ` · ${u.hikes} hikes`}
                    {u.homePlace && ` · ${u.homePlace}`}
                  </div>
                </div>
              </Link>
              <FriendButton userId={u.id} initial={u.state} compact />
            </li>
          ))}
        </ul>
      )}
      {searched && !loading && results.length === 0 && <p className="text-sm text-muted mt-3 text-center">No one by that name yet. Send them your invite link.</p>}
    </div>
  );
}
