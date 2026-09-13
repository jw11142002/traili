"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { toggleWant } from "@/lib/actions/trails";
import { cx } from "./ui";

export default function WantButton({ trailId, initial, size = "md" }: { trailId: string; initial: boolean; size?: "sm" | "md" }) {
  const [wanted, setWanted] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setWanted(!wanted);
        start(async () => {
          const r = await toggleWant(trailId);
          setWanted(r.wanted);
        });
      }}
      className={cx(
        size === "sm" ? "btn px-3 py-2 text-sm" : "btn-secondary",
        wanted ? "bg-clay-500 text-white border-clay-500 hover:bg-clay-600" : size === "sm" ? "bg-white border border-line text-ink hover:bg-stone-50" : "",
      )}
    >
      <Bookmark size={16} fill={wanted ? "currentColor" : "none"} />
      {wanted ? "Saved" : "Want to hike"}
    </button>
  );
}
