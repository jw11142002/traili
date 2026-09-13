"use client";

import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";

export default function InviteLink({ url, compact }: { url: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      prompt("Copy your invite link", url);
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: "Join me on traili", text: "Rank your hikes with me on traili", url });
    } catch {
      /* cancelled */
    }
  };

  return (
    <div className={compact ? "flex gap-2" : "card p-4"}>
      {!compact && (
        <>
          <div className="font-semibold mb-1">Your invite link</div>
          <p className="text-sm text-muted mb-3">Anyone who joins through it becomes your friend automatically.</p>
          <div className="rounded-xl bg-stone-50 border border-line px-3 py-2 text-sm text-stone-600 truncate mb-3 font-mono">{url}</div>
        </>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={copy} className="btn-secondary flex-1">
          {copied ? <Check size={16} className="text-moss-700" /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy link"}
        </button>
        {canShare && (
          <button type="button" onClick={share} className="btn-primary flex-1">
            <Share2 size={16} /> Share
          </button>
        )}
      </div>
    </div>
  );
}
