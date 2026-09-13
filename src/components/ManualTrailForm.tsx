"use client";

import { useState, useTransition } from "react";
import { createManualTrail } from "@/lib/actions/trails";
import type { PlaceResult } from "@/lib/trails";
import { EFFORT } from "@/lib/constants";
import PlacePicker from "./PlacePicker";
import { Spinner, cx } from "./ui";

type Props = {
  initialName?: string;
  onCreated: (trailId: string, name: string) => void;
  onCancel?: () => void;
};

export default function ManualTrailForm({ initialName = "", onCreated, onCancel }: Props) {
  const [name, setName] = useState(initialName);
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [miles, setMiles] = useState("");
  const [feet, setFeet] = useState("");
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [routeType, setRouteType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    setError(null);
    if (!place) {
      setError("Pick the nearest town or park so friends can find it.");
      return;
    }
    start(async () => {
      const res = await createManualTrail({
        name,
        lat: place.lat,
        lng: place.lng,
        region: place.region,
        country: place.country,
        countryCode: place.countryCode,
        distanceKm: miles ? parseFloat(miles) / 0.621371 : null,
        elevationGainM: feet ? parseFloat(feet) / 3.28084 : null,
        difficulty,
        routeType,
      });
      if (res.error || !res.trailId) setError(res.error ?? "Something went wrong");
      else onCreated(res.trailId, name.trim());
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="label">Trail name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. Lake Serene via Bridal Veil Falls" autoFocus={!initialName} />
      </div>
      <div>
        <label className="label">Where is it?</label>
        <PlacePicker value={place} onChange={setPlace} placeholder="Nearest town, park, or range" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Distance (mi)</label>
          <input value={miles} onChange={(e) => setMiles(e.target.value)} inputMode="decimal" className="input" placeholder="Optional" />
        </div>
        <div>
          <label className="label">Elevation gain (ft)</label>
          <input value={feet} onChange={(e) => setFeet(e.target.value)} inputMode="numeric" className="input" placeholder="Optional" />
        </div>
      </div>
      <div>
        <label className="label">Effort</label>
        <div className="flex gap-2 flex-wrap">
          {EFFORT.map((e) => (
            <button key={e.id} type="button" onClick={() => setDifficulty(difficulty === e.id ? null : e.id)} className={difficulty === e.id ? "chip-on" : "chip-off"}>
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
      {error && <p className="text-sm text-rust-600">{error}</p>}
      <div className={cx("flex gap-2", onCancel ? "justify-between" : "justify-end")}>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Back
          </button>
        )}
        <button type="button" onClick={submit} disabled={pending || name.trim().length < 2} className="btn-primary">
          {pending && <Spinner className="border-white/40 border-t-white" />}
          Add trail
        </button>
      </div>
    </div>
  );
}
