"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bookmark, Check, Pencil, X } from "lucide-react";
import { toggleWant, updateWantNote } from "@/lib/actions/trails";
import { fmtDistance } from "@/lib/format";
import { TrailThumb } from "./ui";

export type WantRow = {
  id: string;
  trailId: string;
  name: string;
  region: string | null;
  country: string | null;
  kind: string | null;
  distanceKm: number | null;
  note: string | null;
  photo: string | null;
  friends: { name: string; score: number }[];
};

export default function WantList({ rows: initial }: { rows: WantRow[] }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [, start] = useTransition();

  const remove = (trailId: string) => {
    setRows((r) => r.filter((x) => x.trailId !== trailId));
    start(async () => {
      await toggleWant(trailId);
    });
  };

  const saveNote = (trailId: string) => {
    const note = draft.trim();
    setRows((r) => r.map((x) => (x.trailId === trailId ? { ...x, note: note || null } : x)));
    setEditing(null);
    start(async () => {
      await updateWantNote(trailId, note);
    });
  };

  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {rows.map((row) => (
        <li key={row.id} className="px-3.5 py-3">
          <div className="flex items-center gap-3">
            <Link href={`/trails/${row.trailId}`} className="flex items-center gap-3 min-w-0 flex-1">
              <TrailThumb photo={row.photo} kind={row.kind} size={44} />
              <div className="min-w-0">
                <div className="font-semibold truncate">{row.name}</div>
                <div className="text-sm text-muted truncate">
                  {[row.region, row.country].filter(Boolean).join(", ")}
                  {row.distanceKm != null && ` · ${fmtDistance(row.distanceKm)}`}
                </div>
              </div>
            </Link>
            <Link href={`/log?trail=${row.trailId}`} className="btn-primary px-3 py-2 text-sm">
              <Check size={15} /> Did it
            </Link>
            <button type="button" onClick={() => remove(row.trailId)} className="h-9 w-9 flex items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600" aria-label="Remove">
              <X size={16} />
            </button>
          </div>
          <div className="pl-[56px] mt-1.5 text-sm">
            {editing === row.trailId ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveNote(row.trailId)}
                  className="input py-1.5 text-sm"
                  placeholder="Why / when? e.g. fall colors, needs permit"
                  maxLength={140}
                />
                <button type="button" onClick={() => saveNote(row.trailId)} className="btn-secondary px-3 py-1.5 text-sm">
                  Save
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditing(row.trailId);
                  setDraft(row.note ?? "");
                }}
                className="text-left inline-flex items-center gap-1.5 text-muted hover:text-ink"
              >
                <Pencil size={12} />
                {row.note ? <span className="text-stone-700">{row.note}</span> : <span className="italic">Add a note — why, when, with whom</span>}
              </button>
            )}
            {row.friends.length > 0 && (
              <div className="text-xs text-muted mt-1 flex items-center gap-1">
                <Bookmark size={11} />
                {row.friends
                  .slice(0, 2)
                  .map((f) => `${f.name} gave it ${f.score.toFixed(1)}`)
                  .join(" · ")}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
