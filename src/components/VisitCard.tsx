"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Pencil, Trash2 } from "lucide-react";
import { deleteVisit, updateVisit } from "@/lib/actions/log";
import { COMPANIONS, CONDITIONS, CROWD, REPEAT } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import PhotoUploader from "./PhotoUploader";
import { Spinner } from "./ui";

export type VisitView = {
  id: string;
  date: string;
  notes: string | null;
  conditions: string[];
  companions: string[];
  crowd: string | null;
  wouldRepeat: string | null;
  photos: { id: string; url: string }[];
};

export default function VisitCard({ visit, editable }: { visit: VisitView; editable: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "photos" | "edit">("view");
  const [notes, setNotes] = useState(visit.notes ?? "");
  const [pending, start] = useTransition();

  const chips = [
    ...visit.conditions.map((c) => CONDITIONS.find((x) => x.id === c)?.label ?? c),
    ...visit.companions.map((c) => COMPANIONS.find((x) => x.id === c)?.label ?? c),
    visit.crowd ? CROWD.find((x) => x.id === visit.crowd)?.label : null,
    visit.wouldRepeat ? REPEAT.find((x) => x.id === visit.wouldRepeat)?.label : null,
  ].filter(Boolean) as string[];

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">{fmtDate(visit.date)}</div>
        {editable && (
          <div className="flex gap-1 -mr-2">
            <button type="button" onClick={() => setMode(mode === "photos" ? "view" : "photos")} className="h-8 w-8 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100" aria-label="Photos">
              <Camera size={16} />
            </button>
            <button type="button" onClick={() => setMode(mode === "edit" ? "view" : "edit")} className="h-8 w-8 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100" aria-label="Edit">
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (!confirm("Delete this visit?")) return;
                start(async () => {
                  await deleteVisit(visit.id);
                  router.refresh();
                });
              }}
              className="h-8 w-8 rounded-full flex items-center justify-center text-stone-500 hover:bg-rust-500/10 hover:text-rust-600"
              aria-label="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {mode === "photos" ? (
        <PhotoUploader visitId={visit.id} initial={visit.photos} onChange={() => router.refresh()} />
      ) : visit.photos.length > 0 ? (
        <div className={`grid gap-1.5 mb-2 ${visit.photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {visit.photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.url} alt="" className={`w-full rounded-xl object-cover bg-stone-100 ${visit.photos.length === 1 ? "max-h-80" : "aspect-[4/3]"}`} />
          ))}
        </div>
      ) : null}

      {mode === "edit" ? (
        <div className="mt-2">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input resize-none" placeholder="Notes" />
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={() => setMode("view")} className="btn-secondary px-3 py-1.5 text-sm">
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await updateVisit(visit.id, { notes });
                  setMode("view");
                  router.refresh();
                })
              }
              className="btn-primary px-3 py-1.5 text-sm"
            >
              {pending && <Spinner className="border-white/40 border-t-white" />}
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          {visit.notes ? <p className="text-[15px] whitespace-pre-line">{visit.notes}</p> : editable && mode === "view" && <p className="text-sm text-muted italic">No notes yet.</p>}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {chips.map((c) => (
                <span key={c} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                  {c}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
