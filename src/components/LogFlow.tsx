"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, X, Minus, Plus, ChevronRight } from "lucide-react";
import { ensureTrail } from "@/lib/actions/trails";
import type { TrailHit } from "@/lib/actions/trails";
import { commitLog, startRanking, updateVisit, type Candidate, type CommitResult } from "@/lib/actions/log";
import { setScore as setScoreAction } from "@/lib/actions/ranks";
import { BUCKETS, clampScore, formatScore, type Bucket } from "@/lib/ranking";
import { COMPANIONS, CONDITIONS, CROWD, EFFORT, REPEAT } from "@/lib/constants";
import { fmtDistance } from "@/lib/format";
import TrailSearch from "./TrailSearch";
import ManualTrailForm from "./ManualTrailForm";
import PhotoUploader from "./PhotoUploader";
import { ScoreBadge, Spinner, TrailThumb, cx } from "./ui";

export type LogTrail = {
  id: string;
  name: string;
  region: string | null;
  country: string | null;
  difficulty: string | null;
  kind: string | null;
  distanceKm: number | null;
};

type Step = "pick" | "manual" | "feel" | "compare" | "reveal" | "details";

type Props = {
  initialTrail?: LogTrail | null;
  /** Called instead of navigating away when the flow finishes (used by onboarding). */
  onComplete?: (result: { trail: LogTrail; score: number; position: number }) => void;
  onClose?: () => void;
  embedded?: boolean;
  /** Onboarding: skip the photos/notes step and finish right after the reveal. */
  quick?: boolean;
};

function today() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export default function LogFlow({ initialTrail, onComplete, onClose, embedded, quick }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialTrail ? "feel" : "pick");
  const [trail, setTrail] = useState<LogTrail | null>(initialTrail ?? null);
  const [manualName, setManualName] = useState("");
  const [pending, start] = useTransition();

  // feel
  const [bucket, setBucket] = useState<Bucket | null>(null);
  const [date, setDate] = useState(today());
  const [effort, setEffort] = useState<string>(initialTrail?.difficulty ?? "moderate");
  const [existing, setExisting] = useState<{ score: number; bucket: Bucket } | null>(null);
  const [rerankConfirmed, setRerankConfirmed] = useState(false);
  const [visitOnly, setVisitOnly] = useState(false);

  // compare
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [usedFallback, setUsedFallback] = useState(false);
  const [lo, setLo] = useState(0);
  const [hi, setHi] = useState(0);
  const [asked, setAsked] = useState(0);

  // reveal
  const [result, setResult] = useState<CommitResult | null>(null);
  const [score, setScoreLocal] = useState<number>(0);

  // details
  const [notes, setNotes] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [companions, setCompanions] = useState<string[]>([]);
  const [crowd, setCrowd] = useState<string | null>(null);
  const [repeat, setRepeat] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (trail?.difficulty) setEffort(trail.difficulty);
  }, [trail]);

  const expectedComparisons = useMemo(() => Math.ceil(Math.log2(candidates.length + 1)), [candidates.length]);

  const close = () => {
    if (onClose) onClose();
    else router.back();
  };

  const pickHit = (hit: TrailHit) => {
    start(async () => {
      const { trailId } = await ensureTrail(hit);
      setTrail({ id: trailId, name: hit.name, region: hit.region, country: hit.country, difficulty: null, kind: hit.kind, distanceKm: hit.distanceKm });
      setStep("feel");
    });
  };

  const beginCompare = (chosen: Bucket) => {
    if (!trail) return;
    setBucket(chosen);
    setError(null);
    start(async () => {
      const res = await startRanking(trail.id, chosen, effort);
      setExisting(res.existing);
      setCandidates(res.candidates);
      setUsedFallback(res.usedFallback);
      setLo(0);
      setHi(res.candidates.length);
      setAsked(0);
      if (res.candidates.length === 0) {
        await finishCompare(chosen, [], 0);
      } else {
        setStep("compare");
      }
    });
  };

  const finishCompare = async (chosen: Bucket, cands: Candidate[], insertIndex: number, keep = false) => {
    if (!trail) return;
    const res = await commitLog({
      trailId: trail.id,
      bucket: chosen,
      candidateRankIds: cands.map((c) => c.rankId),
      insertIndex,
      keepExistingRank: keep,
      visit: { date, effort, conditions: [], companions: [], crowd: null, wouldRepeat: null },
    });
    if ("error" in res && res.error) {
      setError(res.error);
      setStep("feel");
      return;
    }
    const r = res as CommitResult;
    setResult(r);
    setScoreLocal(r.score);
    setStep(keep ? "details" : "reveal");
  };

  const answer = (preferNew: boolean | null) => {
    if (!bucket) return;
    const mid = Math.floor((lo + hi) / 2);
    let nextLo = lo;
    let nextHi = hi;
    if (preferNew === null) {
      // Too close to call: slot it right below the one we compared against.
      nextLo = mid + 1;
      nextHi = mid + 1;
    } else if (preferNew) nextHi = mid;
    else nextLo = mid + 1;
    setAsked((a) => a + 1);
    setLo(nextLo);
    setHi(nextHi);
    if (nextLo >= nextHi) {
      start(async () => {
        await finishCompare(bucket, candidates, nextLo);
      });
    }
  };

  const [scoreDraft, setScoreDraft] = useState("");
  useEffect(() => {
    if (result) setScoreDraft(formatScore(result.score));
  }, [result]);

  const nudge = (delta: number) => {
    if (!result) return;
    const next = clampScore(Math.round((score + delta) * 10) / 10);
    setScoreLocal(next);
    setScoreDraft(formatScore(next));
    start(async () => {
      const r = await setScoreAction(result.rankId, next);
      if (r.score != null) setScoreLocal(r.score);
    });
  };

  const scoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitScoreInput = (raw: string, immediate = false) => {
    if (!result) return;
    const n = parseFloat(raw);
    if (scoreTimer.current) clearTimeout(scoreTimer.current);
    if (!Number.isFinite(n) || n < 1 || n > 10) {
      if (immediate) setScoreDraft(formatScore(score));
      return;
    }
    const next = clampScore(n);
    const run = () => {
      setScoreLocal(next);
      start(async () => {
        await setScoreAction(result.rankId, next);
      });
    };
    if (immediate) {
      setScoreDraft(formatScore(next));
      run();
    } else scoreTimer.current = setTimeout(run, 600);
  };

  const finish = () => {
    if (!result || !trail) return;
    start(async () => {
      await updateVisit(result.visitId, { notes, conditions, companions, crowd, wouldRepeat: repeat });
      if (onComplete) onComplete({ trail, score, position: result.position });
      else router.push(`/trails/${trail.id}?logged=1`);
    });
  };

  const toggle = (list: string[], set: (v: string[]) => void, id: string) => set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const header = (title: string, back?: () => void) => (
    <div className="flex items-center justify-between mb-5">
      <button type="button" onClick={back ?? close} className="h-10 w-10 -ml-2 flex items-center justify-center rounded-full hover:bg-stone-100" aria-label={back ? "Back" : "Close"}>
        {back ? <ArrowLeft size={22} /> : <X size={22} />}
      </button>
      <div className="text-sm font-semibold text-muted">{title}</div>
      <div className="w-10" />
    </div>
  );

  const trailLine = trail && (
    <div className="flex items-center gap-3 mb-6">
      <TrailThumb kind={trail.kind} size={44} />
      <div className="min-w-0">
        <div className="font-semibold truncate">{trail.name}</div>
        <div className="text-sm text-muted truncate">{[trail.region, trail.country].filter(Boolean).join(", ")}</div>
      </div>
    </div>
  );

  // ---------- Steps ----------

  if (step === "pick") {
    return (
      <div className={cx(!embedded && "animate-fade-up")}>
        {header("Log a hike")}
        <h1 className="text-2xl font-bold tracking-tight mb-1">Where did you go?</h1>
        <p className="text-muted text-sm mb-4">Search any trail on the map — Utah to the Dolomites.</p>
        <TrailSearch
          autoFocus
          onPick={pickHit}
          onManual={(q) => {
            setManualName(q);
            setStep("manual");
          }}
        />
        {pending && (
          <div className="flex items-center gap-2 text-sm text-muted mt-4">
            <Spinner /> Pulling trail details from OpenStreetMap…
          </div>
        )}
      </div>
    );
  }

  if (step === "manual") {
    return (
      <div className="animate-fade-up">
        {header("Add a trail", () => setStep("pick"))}
        <h1 className="text-2xl font-bold tracking-tight mb-4">Add it yourself</h1>
        <ManualTrailForm
          initialName={manualName}
          onCancel={() => setStep("pick")}
          onCreated={(id, name) => {
            setTrail({ id, name, region: null, country: null, difficulty: null, kind: "trail", distanceKm: null });
            setStep("feel");
          }}
        />
      </div>
    );
  }

  if (step === "feel" && trail) {
    return (
      <div className="animate-fade-up">
        {header("Log a hike", initialTrail ? undefined : () => setStep("pick"))}
        {trailLine}
        <h1 className="text-2xl font-bold tracking-tight mb-4">How was it?</h1>
        <div className="grid gap-2.5 mb-6">
          {(Object.keys(BUCKETS) as Bucket[]).map((b) => (
            <button
              key={b}
              type="button"
              disabled={pending}
              onClick={() => beginCompare(b)}
              className={cx(
                "card flex items-center gap-4 px-4 py-4 text-left hover:border-moss-400 hover:bg-moss-50/40 active:bg-moss-50 transition-colors",
                bucket === b && "border-moss-600 bg-moss-50",
              )}
            >
              <span className="text-2xl w-9 text-center">{BUCKETS[b].emoji}</span>
              <span>
                <span className="block font-semibold">{BUCKETS[b].label}</span>
                <span className="block text-sm text-muted">{BUCKETS[b].blurb}</span>
              </span>
              <ChevronRight className="ml-auto text-stone-400" size={18} />
            </button>
          ))}
        </div>

        <div className="grid gap-3 mb-2">
          <div>
            <label className="label">Effort</label>
            <div className="flex rounded-xl border border-line bg-white p-1">
              {EFFORT.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEffort(e.id)}
                  className={cx("flex-1 rounded-lg py-2 text-sm font-medium", effort === e.id ? "bg-moss-600 text-white" : "text-stone-600 hover:bg-stone-50")}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">When</label>
            <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className="input" />
          </div>
        </div>
        <p className="text-xs text-muted">Effort decides which of your hikes we compare this against.</p>
        {pending && (
          <div className="flex items-center gap-2 text-sm text-muted mt-4">
            <Spinner /> Lining up your comparisons…
          </div>
        )}
        {error && <p className="text-sm text-rust-600 mt-3">{error}</p>}
      </div>
    );
  }

  if (step === "compare" && trail && bucket) {
    const mid = Math.floor((lo + hi) / 2);
    const other = candidates[mid];
    if (existing && !rerankConfirmed && asked === 0) {
      // Re-hike: offer to keep the current rank.
      return (
        <div className="animate-fade-up">
          {header("Hiked it again", () => setStep("feel"))}
          {trailLine}
          <h1 className="text-2xl font-bold tracking-tight mb-2">You’ve ranked this before</h1>
          <p className="text-muted mb-6">
            It’s currently a <ScoreBadge score={existing.score} size="sm" /> on your list. Did this trip change your mind?
          </p>
          <div className="grid gap-2.5">
            <button type="button" onClick={() => setRerankConfirmed(true)} className="btn-primary btn-lg">
              Yes, re-rank it
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setVisitOnly(true);
                start(async () => {
                  await finishCompare(existing.bucket, [], 0, true);
                });
              }}
              className="btn-secondary btn-lg"
            >
              No, just log the visit
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="animate-fade-up" key={asked}>
        {header(`${Math.min(asked + 1, expectedComparisons)} of ~${expectedComparisons}`, () => setStep("feel"))}
        <h1 className="text-2xl font-bold tracking-tight mb-1">Which did you prefer?</h1>
        <p className="text-sm text-muted mb-5">
          {usedFallback ? "Comparing against everything you’ve rated the same way." : "Comparing against hikes of similar effort."}
        </p>
        <div className="grid gap-3">
          <CompareCard candidate={{ name: trail.name, region: trail.region, country: trail.country, photo: null, distanceKm: trail.distanceKm, kind: trail.kind }} badge="New" onClick={() => answer(true)} disabled={pending} />
          <div className="text-center text-xs font-semibold uppercase tracking-widest text-stone-400">or</div>
          {other && <CompareCard candidate={other} onClick={() => answer(false)} disabled={pending} />}
        </div>
        <button type="button" onClick={() => answer(null)} disabled={pending} className="btn-ghost w-full mt-4">
          Too close to call
        </button>
        {pending && (
          <div className="flex justify-center mt-2">
            <Spinner />
          </div>
        )}
      </div>
    );
  }

  if (step === "reveal" && trail && result) {
    return (
      <div className="animate-fade-up">
        {header("Ranked")}
        <div className="text-center pt-4 pb-8">
          <div className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">{trail.name}</div>
          <div className="flex items-center justify-center gap-5 animate-pop">
            <div>
              <div className="text-5xl font-extrabold tracking-tight">#{result.position}</div>
              <div className="text-sm text-muted mt-1">of {result.total} hikes</div>
            </div>
            <ScoreBadge score={score} size="xl" />
          </div>
          <div className="mt-6 text-sm text-muted space-y-1">
            {result.above && (
              <div>
                Just below <span className="font-medium text-ink">{result.above.name}</span> ({formatScore(result.above.score)})
              </div>
            )}
            {result.below && (
              <div>
                Just above <span className="font-medium text-ink">{result.below.name}</span> ({formatScore(result.below.score)})
              </div>
            )}
            {!result.above && !result.below && <div>Your first ranked hike. The list starts here.</div>}
          </div>
        </div>

        <div className="card p-4 mb-4">
          <div className="text-sm font-semibold mb-2">Fine-tune the score</div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => nudge(-0.1)} className="btn-secondary h-11 w-11 p-0 rounded-full" aria-label="Lower">
              <Minus size={18} />
            </button>
            <input
              value={scoreDraft}
              inputMode="decimal"
              onChange={(e) => {
                setScoreDraft(e.target.value);
                commitScoreInput(e.target.value);
              }}
              onBlur={(e) => commitScoreInput(e.target.value, true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="input text-center text-xl font-bold tabular-nums flex-1"
            />
            <button type="button" onClick={() => nudge(0.1)} className="btn-secondary h-11 w-11 p-0 rounded-full" aria-label="Raise">
              <Plus size={18} />
            </button>
          </div>
          <p className="text-xs text-muted mt-2">
            Nudging past a neighbour moves your rank. Or{" "}
            <Link href="/lists" className="text-moss-700 font-medium underline-offset-2 hover:underline">
              drag it in your list
            </Link>
            .
          </p>
        </div>

        {quick ? (
          <button type="button" onClick={finish} disabled={pending} className="btn-primary btn-lg w-full">
            {pending && <Spinner className="border-white/40 border-t-white" />}
            Next
          </button>
        ) : (
          <>
            <button type="button" onClick={() => setStep("details")} className="btn-primary btn-lg w-full">
              Add photos & notes
            </button>
            <button type="button" onClick={finish} disabled={pending} className="btn-ghost w-full mt-2">
              Skip for now
            </button>
          </>
        )}
      </div>
    );
  }

  if (step === "details" && trail && result) {
    return (
      <div className="animate-fade-up">
        {header("Your visit", visitOnly ? undefined : () => setStep("reveal"))}
        <div className="flex items-center gap-3 mb-5">
          <ScoreBadge score={score} size="md" />
          <div className="min-w-0">
            <div className="font-semibold truncate">{trail.name}</div>
            <div className="text-sm text-muted">
              #{result.position} of {result.total}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <label className="label">Photos</label>
            <PhotoUploader visitId={result.visitId} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="The one-liner you’d text a friend. Where to park, what to skip, when to go."
            />
          </div>
          <ChipGroup label="Conditions" options={CONDITIONS} value={conditions} onToggle={(id) => toggle(conditions, setConditions, id)} />
          <ChipGroup label="Who came" options={COMPANIONS} value={companions} onToggle={(id) => toggle(companions, setCompanions, id)} />
          <ChipGroup label="Crowds" options={CROWD} value={crowd ? [crowd] : []} onToggle={(id) => setCrowd(crowd === id ? null : id)} />
          <ChipGroup label="Would you go back?" options={REPEAT} value={repeat ? [repeat] : []} onToggle={(id) => setRepeat(repeat === id ? null : id)} />
        </div>

        <button type="button" onClick={finish} disabled={pending} className="btn-primary btn-lg w-full mt-8">
          {pending && <Spinner className="border-white/40 border-t-white" />}
          Done
        </button>
      </div>
    );
  }

  return null;
}

function CompareCard({
  candidate,
  badge,
  onClick,
  disabled,
}: {
  candidate: { name: string; region: string | null; country: string | null; photo: string | null; distanceKm: number | null; kind?: string | null };
  badge?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="card relative w-full text-left p-4 flex items-center gap-4 hover:border-moss-500 hover:bg-moss-50/40 active:bg-moss-50 transition-colors min-h-24"
    >
      <TrailThumb photo={candidate.photo} kind={candidate.kind} size={56} />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-lg leading-tight">{candidate.name}</div>
        <div className="text-sm text-muted truncate mt-0.5">
          {[candidate.region, candidate.country].filter(Boolean).join(", ")}
          {candidate.distanceKm != null && ` · ${fmtDistance(candidate.distanceKm)}`}
        </div>
      </div>
      {badge && <span className="absolute top-2 right-3 text-[10px] font-bold uppercase tracking-wider text-moss-700 bg-moss-100 rounded-full px-2 py-0.5">{badge}</span>}
    </button>
  );
}

export function ChipGroup({
  label,
  options,
  value,
  onToggle,
}: {
  label: string;
  options: ReadonlyArray<{ id: string; label: string }>;
  value: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.id} type="button" onClick={() => onToggle(o.id)} className={value.includes(o.id) ? "chip-on" : "chip-off"}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
