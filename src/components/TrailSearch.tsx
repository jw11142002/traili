"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, MapPin, Bookmark } from "lucide-react";
import { searchTrailsAction, type TrailHit } from "@/lib/actions/trails";
import { fmtDistance } from "@/lib/format";
import { KindBadge, ScoreBadge, Spinner, TrailThumb, cx } from "./ui";

type Props = {
  onPick: (hit: TrailHit) => void;
  onManual?: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  initialQuery?: string;
  compact?: boolean;
};

export default function TrailSearch({ onPick, onManual, placeholder, autoFocus, initialQuery = "", compact }: Props) {
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<TrailHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const reqId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      const res = await searchTrailsAction(query);
      if (id !== reqId.current) return;
      setResults(res.results);
      setError(res.error ?? null);
      setSearched(true);
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div>
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus={autoFocus}
          placeholder={placeholder ?? "Search a trail, summit, or lake…"}
          className={cx("input pl-10 pr-10", compact ? "py-2.5" : "py-3.5 text-base")}
          autoComplete="off"
          enterKeyHint="search"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
          {loading ? (
            <Spinner />
          ) : q ? (
            <button
              type="button"
              onClick={() => {
                setQ("");
                inputRef.current?.focus();
              }}
              className="text-stone-400 hover:text-stone-600"
              aria-label="Clear"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
      </div>

      {q.trim().length >= 2 && (
        <div className="mt-3 card overflow-hidden divide-y divide-line">
          {results.map((hit) => (
            <button
              key={`${hit.osmType}:${hit.osmId}`}
              type="button"
              onClick={() => onPick(hit)}
              className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-stone-50 active:bg-stone-100"
            >
              <TrailThumb kind={hit.kind} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{hit.name}</span>
                  {hit.wanted && <Bookmark size={14} className="text-clay-500 shrink-0" fill="currentColor" />}
                </div>
                <div className="text-sm text-muted truncate flex items-center gap-1.5">
                  <KindBadge kind={hit.kind} />
                  {hit.subtitle && <span>· {hit.subtitle}</span>}
                  {hit.distanceKm != null && <span>· {fmtDistance(hit.distanceKm)}</span>}
                </div>
              </div>
              {hit.myScore != null && <ScoreBadge score={hit.myScore} size="sm" />}
            </button>
          ))}
          {!loading && searched && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted">
              {error ?? (
                <>
                  Nothing on the map called “{q.trim()}”.
                  <br />
                  Try the official name, a nearby summit, or the trailhead.
                </>
              )}
            </div>
          )}
          {onManual && searched && !loading && (
            <button
              type="button"
              onClick={() => onManual(q.trim())}
              className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-stone-50 text-moss-700 font-medium"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-moss-50">
                <MapPin size={20} />
              </span>
              Can’t find it? Add “{q.trim()}” manually
            </button>
          )}
        </div>
      )}
    </div>
  );
}
