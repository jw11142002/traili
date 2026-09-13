"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";

function shareHref(serverUrl: string) {
  try {
    const parsed = new URL(serverUrl, window.location.origin);
    const here = window.location.hostname;
    // If the user is already on the custom domain, keep that origin. Otherwise keep
    // the server URL (APP_URL / traili.justinyjwang.com) so copies don't go to vercel.app.
    if (here === "traili.justinyjwang.com" || here.endsWith(".justinyjwang.com")) {
      return `${window.location.origin}${parsed.pathname}`;
    }
    return parsed.href;
  } catch {
    return serverUrl;
  }
}

export default function InviteLink({ url, compact }: { url: string; compact?: boolean }) {
  const [href, setHref] = useState(url);
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    setHref(shareHref(url));
  }, [url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      prompt("Copy your invite link", href);
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: "Join me on traili", text: "Rank your hikes with me on traili", url: href });
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
          <div className="rounded-xl bg-stone-50 border border-line px-3 py-2 text-sm text-stone-600 truncate mb-3 font-mono">{href}</div>
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
