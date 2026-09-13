"use client";

import { useState, useTransition } from "react";
import { UserPlus, UserCheck, Clock, Check, X } from "lucide-react";
import { removeFriend, respondToRequest, sendFriendRequest } from "@/lib/actions/social";
import type { FriendState } from "@/lib/queries";
import { cx } from "./ui";

export default function FriendButton({ userId, initial, compact }: { userId: string; initial: FriendState; compact?: boolean }) {
  const [state, setState] = useState<FriendState>(initial);
  const [pending, start] = useTransition();
  const base = compact ? "btn px-3 py-1.5 text-sm" : "btn";

  if (state === "self") return null;

  if (state === "friends") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("Remove this friend?")) return;
          start(async () => setState((await removeFriend(userId)).state));
        }}
        className={cx(base, "bg-moss-50 text-moss-800 border border-moss-200 hover:bg-moss-100")}
      >
        <UserCheck size={16} /> Friends
      </button>
    );
  }
  if (state === "outgoing") {
    return (
      <button type="button" disabled={pending} onClick={() => start(async () => setState((await removeFriend(userId)).state))} className={cx(base, "bg-white border border-line text-muted")}>
        <Clock size={16} /> Requested
      </button>
    );
  }
  if (state === "incoming") {
    return (
      <div className="flex gap-1.5">
        <button type="button" disabled={pending} onClick={() => start(async () => setState((await respondToRequest(userId, true)).state))} className={cx(base, "bg-moss-600 text-white hover:bg-moss-700")}>
          <Check size={16} /> Accept
        </button>
        <button type="button" disabled={pending} onClick={() => start(async () => setState((await respondToRequest(userId, false)).state))} className={cx(base, "bg-white border border-line")} aria-label="Decline">
          <X size={16} />
        </button>
      </div>
    );
  }
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => setState((await sendFriendRequest(userId)).state))} className={cx(base, "bg-moss-600 text-white hover:bg-moss-700")}>
      <UserPlus size={16} /> Add friend
    </button>
  );
}
