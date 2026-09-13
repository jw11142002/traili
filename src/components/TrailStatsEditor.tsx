"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateTrailStats } from "@/lib/actions/trails";
import { EFFORT } from "@/lib/constants";
import { Spinner, cx } from "./ui";

type Props = {
  trailId: string;
  distanceKm: number | null;
  elevationGainM: number | null;
  difficulty: string | null;
  routeType: string | null;
  description: string | null;
};

export default function TrailStatsEditor(t: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [miles, setMiles] = useState(t.distanceKm != null ? (t.distanceKm * 0.621371).toFixed(1) : "");
  const [feet, setFeet] = useState(t.elevationGainM != null ? String(Math.round(t.elevationGainM * 3.28084)) : "");
  const [difficulty, setDifficulty] = useState<string | null>(t.difficulty);
  const [routeType, setRouteType] = useState<string | null>(t.routeType);
  const [description, setDescription] = useState(t.description ?? "");
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-muted inline-flex items-center gap-1.5 hover:text-ink">
        <Pencil size={13} /> {t.distanceKm == null && t.elevationGainM == null ? "Add distance & elevation" : "Edit details"}
      </button>
    );
  }

  return (
    <div className="card p-4 flex flex-col gap-3 animate-fade-up">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Distance (mi)</label>
          <input value={miles} onChange={(e) => setMiles(e.target.value)} inputMode="decimal" className="input" />
        </div>
        <div>
          <label className="label">Elevation gain (ft)</label>
          <input value={feet} onChange={(e) => setFeet(e.target.value)} inputMode="numeric" className="input" />
        </div>
      </div>
      <div>
        <label className="label">Effort</label>
        <div className="flex gap-2">
          {EFFORT.map((e) => (
            <button key={e.id} type="button" onClick={() => setDifficulty(e.id)} className={difficulty === e.id ? "chip-on" : "chip-off"}>
              {e.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Route</label>
        <div className="flex gap-2 flex-wrap">
          {[
            ["loop", "Loop"],
            ["out-and-back", "Out & back"],
            ["point-to-point", "Point to point"],
          ].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setRouteType(routeType === id ? null : id)} className={routeType === id ? "chip-on" : "chip-off"}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Good to know</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input resize-none" placeholder="Parking, permits, best season…" />
      </div>
      <div className={cx("flex justify-end gap-2")}>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary px-3 py-2 text-sm">
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await updateTrailStats(t.trailId, {
                distanceKm: miles ? parseFloat(miles) / 0.621371 : null,
                elevationGainM: feet ? parseFloat(feet) / 3.28084 : null,
                difficulty,
                routeType,
                description,
              });
              setOpen(false);
              router.refresh();
            })
          }
          className="btn-primary px-3 py-2 text-sm"
        >
          {pending && <Spinner className="border-white/40 border-t-white" />}
          Save
        </button>
      </div>
    </div>
  );
}
