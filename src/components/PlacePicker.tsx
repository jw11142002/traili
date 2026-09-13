"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";
import { findPlaces } from "@/lib/actions/profile";
import type { PlaceResult } from "@/lib/trails";
import { Spinner } from "./ui";

type Props = {
  value: PlaceResult | null;
  onChange: (p: PlaceResult | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

export default function PlacePicker({ value, onChange, placeholder, autoFocus }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      const r = await findPlaces(q.trim());
      if (id !== reqId.current) return;
      setResults(r);
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-moss-200 bg-moss-50 px-3.5 py-3">
        <MapPin size={18} className="text-moss-700" />
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{value.name}</div>
          {value.subtitle && <div className="text-sm text-muted truncate">{value.subtitle}</div>}
        </div>
        <button type="button" onClick={() => onChange(null)} className="text-stone-500 hover:text-stone-700" aria-label="Change">
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder ?? "City or region"}
          className="input pl-10 pr-10"
          autoFocus={autoFocus}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Spinner />
          </div>
        )}
      </div>
      {results.length > 0 && (
        <div className="mt-2 card overflow-hidden divide-y divide-line">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onChange(r);
                setQ("");
                setResults([]);
              }}
              className="w-full px-3.5 py-2.5 text-left hover:bg-stone-50"
            >
              <div className="font-medium">{r.name}</div>
              {r.subtitle && <div className="text-sm text-muted">{r.subtitle}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
