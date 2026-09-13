"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Camera, Scale, ListOrdered, Users } from "lucide-react";
import { checkUsername, completeOnboarding, updateProfile } from "@/lib/actions/profile";
import { addPhotos } from "@/lib/actions/photos";
import { shrinkImage } from "@/lib/clientImage";
import { TASTES, COMFORT } from "@/lib/constants";
import type { PlaceResult } from "@/lib/trails";
import PlacePicker from "./PlacePicker";
import LogFlow, { type LogTrail } from "./LogFlow";
import UserSearch from "./UserSearch";
import InviteLink from "./InviteLink";
import { Avatar, ScoreBadge, Spinner, cx } from "./ui";

type Props = {
  user: { name: string; username: string | null; avatarUrl: string | null; homePlace: string | null; tastes: string[]; comfort: string | null };
  suggestedUsername: string;
  inviteUrl: string;
  friendCount: number;
  rankedCount: number;
};

type Step = "welcome" | "profile" | "taste" | "seed" | "friends" | "done";
const ORDER: Step[] = ["welcome", "profile", "taste", "seed", "friends", "done"];

const SLIDES = [
  {
    icon: Scale,
    title: "Rank, don’t rate",
    body: "Stars are meaningless. Tell us how a hike felt, answer a couple of “which did you prefer?” calls, and it lands in your list with a score.",
  },
  {
    icon: ListOrdered,
    title: "A list that’s actually yours",
    body: "Every hike you’ve done, in order. Drag to reorder, nudge a score, add photos and the one-liner you’d text a friend.",
  },
  {
    icon: Users,
    title: "Friends, not the internet",
    body: "No global feed, no strangers. See what the people you hike with ranked, saved, and went back to.",
  },
];

const STEP_KEY = "traili.onboarding.step";

export default function Onboarding({ user, suggestedUsername, inviteUrl, friendCount, rankedCount }: Props) {
  const router = useRouter();
  const [step, setStepState] = useState<Step>("welcome");
  const setStep = (s: Step) => {
    setStepState(s);
    try {
      sessionStorage.setItem(STEP_KEY, s);
    } catch {
      /* ignore */
    }
  };
  // Resume where the user left off if they refresh mid-onboarding.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STEP_KEY) as Step | null;
      if (saved && ORDER.includes(saved)) setStepState(saved);
    } catch {
      /* ignore */
    }
  }, []);
  const [slide, setSlide] = useState(0);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // profile
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username ?? suggestedUsername);
  const [usernameState, setUsernameState] = useState<{ ok: boolean; reason?: string } | null>(null);
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [avatar, setAvatar] = useState<string | null>(user.avatarUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  // taste
  const [tastes, setTastes] = useState<string[]>(user.tastes ?? []);
  const [comfort, setComfort] = useState<string | null>(user.comfort ?? null);

  // seed
  const [added, setAdded] = useState<{ trail: LogTrail; score: number; position: number }[]>([]);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!username) return setUsernameState(null);
      const r = await checkUsername(username);
      setUsernameState(r);
    }, 350);
    return () => clearTimeout(t);
  }, [username]);

  const idx = ORDER.indexOf(step);
  const progress = ((idx + 1) / ORDER.length) * 100;

  const next = () => setStep(ORDER[Math.min(ORDER.length - 1, idx + 1)]);
  const back = () => setStep(ORDER[Math.max(0, idx - 1)]);

  const saveProfile = () => {
    setError(null);
    start(async () => {
      const res = await updateProfile({
        name,
        username,
        homePlace: place ? [place.name, place.region].filter(Boolean).join(", ") : undefined,
        homeLat: place?.lat,
        homeLng: place?.lng,
      });
      if (res.error) setError(res.error);
      else next();
    });
  };

  const saveTaste = () => {
    start(async () => {
      await updateProfile({ tastes, comfort });
      next();
    });
  };

  const finish = () => {
    start(async () => {
      await completeOnboarding();
      try {
        sessionStorage.removeItem(STEP_KEY);
      } catch {
        /* ignore */
      }
      router.push("/home");
      router.refresh();
    });
  };
  const totalRanked = Math.max(rankedCount, added.length);

  const uploadAvatar = (files: FileList | null) => {
    if (!files?.[0]) return;
    const file = files[0];
    start(async () => {
      const fd = new FormData();
      fd.set("kind", "avatar");
      fd.append("files", await shrinkImage(file, 1000));
      const r = await addPhotos(fd);
      if (r.photos?.[0]) setAvatar(r.photos[0].url);
    });
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="h-1 bg-stone-200">
        <div className="h-full bg-moss-600 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col px-5 py-6">
        {step === "welcome" && (
          <div className="flex-1 flex flex-col animate-fade-up" key={slide}>
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="h-20 w-20 rounded-3xl bg-moss-50 text-moss-700 flex items-center justify-center mb-8">
                {(() => {
                  const I = SLIDES[slide].icon;
                  return <I size={36} />;
                })()}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight mb-3">{SLIDES[slide].title}</h1>
              <p className="text-stone-600 text-lg leading-relaxed max-w-sm">{SLIDES[slide].body}</p>
            </div>
            <div className="flex justify-center gap-1.5 mb-6">
              {SLIDES.map((_, i) => (
                <button key={i} type="button" onClick={() => setSlide(i)} className={cx("h-2 rounded-full transition-all", i === slide ? "w-6 bg-moss-600" : "w-2 bg-stone-300")} aria-label={`Slide ${i + 1}`} />
              ))}
            </div>
            <button type="button" onClick={() => (slide < SLIDES.length - 1 ? setSlide(slide + 1) : next())} className="btn-primary btn-lg w-full">
              {slide < SLIDES.length - 1 ? "Next" : "Let’s set you up"} <ArrowRight size={18} />
            </button>
            {slide < SLIDES.length - 1 && (
              <button type="button" onClick={next} className="btn-ghost w-full mt-2">
                Skip intro
              </button>
            )}
          </div>
        )}

        {step === "profile" && (
          <div className="flex-1 flex flex-col animate-fade-up">
            <h1 className="text-2xl font-bold tracking-tight mb-1">Make it yours</h1>
            <p className="text-muted mb-6">This is how friends will find you.</p>

            <div className="flex items-center gap-4 mb-6">
              <button type="button" onClick={() => fileRef.current?.click()} className="relative" aria-label="Upload photo">
                <Avatar name={name || "?"} src={avatar} size={72} />
                <span className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-moss-600 text-white flex items-center justify-center ring-2 ring-white">
                  {pending ? <Spinner className="border-white/40 border-t-white h-3 w-3" /> : <Camera size={14} />}
                </span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadAvatar(e.target.files)} />
              <div className="text-sm text-muted">Add a photo so friends recognise you on the feed. Optional.</div>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="label">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Username</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">@</span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    className="input pl-8 pr-9"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                  {usernameState?.ok && <Check size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-moss-600" />}
                </div>
                {usernameState && !usernameState.ok && <p className="text-xs text-rust-600 mt-1">{usernameState.reason}</p>}
              </div>
              <div>
                <label className="label">Home base</label>
                <PlacePicker value={place} onChange={setPlace} placeholder={user.homePlace ?? "City or region you hike from"} />
                <p className="text-xs text-muted mt-1.5">We’ll show trails near here first when you search.</p>
              </div>
            </div>
            {error && <p className="text-sm text-rust-600 mt-3">{error}</p>}
            <div className="mt-auto pt-8 flex gap-2">
              <button type="button" onClick={back} className="btn-secondary btn-lg">
                Back
              </button>
              <button type="button" onClick={saveProfile} disabled={pending || !name.trim() || usernameState?.ok === false} className="btn-primary btn-lg flex-1">
                {pending && <Spinner className="border-white/40 border-t-white" />}
                Continue
              </button>
            </div>
          </div>
        )}

        {step === "taste" && (
          <div className="flex-1 flex flex-col animate-fade-up">
            <h1 className="text-2xl font-bold tracking-tight mb-1">What makes a great hike?</h1>
            <p className="text-muted mb-5">Pick a few. This shapes what we suggest from friends’ lists.</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {TASTES.map((t) => {
                const on = tastes.includes(t.id);
                return (
                  <button key={t.id} type="button" onClick={() => setTastes(on ? tastes.filter((x) => x !== t.id) : [...tastes, t.id])} className={cx(on ? "chip-on" : "chip-off", "py-2")}>
                    <span>{t.emoji}</span> {t.label}
                  </button>
                );
              })}
            </div>
            <label className="label">Your sweet spot</label>
            <div className="grid grid-cols-2 gap-2">
              {COMFORT.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setComfort(c.id)}
                  className={cx("card text-left px-3.5 py-3 transition-colors", comfort === c.id ? "border-moss-600 bg-moss-50" : "hover:bg-stone-50")}
                >
                  <div className="font-semibold text-sm">{c.label}</div>
                  <div className="text-xs text-muted">{c.detail}</div>
                </button>
              ))}
            </div>
            <div className="mt-auto pt-8 flex gap-2">
              <button type="button" onClick={back} className="btn-secondary btn-lg">
                Back
              </button>
              <button type="button" onClick={saveTaste} disabled={pending} className="btn-primary btn-lg flex-1">
                {pending && <Spinner className="border-white/40 border-t-white" />}
                {tastes.length === 0 && !comfort ? "Skip" : "Continue"}
              </button>
            </div>
          </div>
        )}

        {step === "seed" && logging && (
          <LogFlow
            embedded
            quick
            onClose={() => setLogging(false)}
            onComplete={(r) => {
              setAdded((cur) => [...cur.filter((a) => a.trail.id !== r.trail.id), r]);
              setLogging(false);
            }}
          />
        )}

        {step === "seed" && !logging && (
          <div className="flex-1 flex flex-col animate-fade-up">
            <h1 className="text-2xl font-bold tracking-tight mb-1">Rank your first hikes</h1>
            <p className="text-muted mb-5">Start with three you remember well. Your list gets smarter with every one.</p>

            {added.length > 0 && (
              <ol className="card divide-y divide-line overflow-hidden mb-4">
                {[...added]
                  .sort((a, b) => b.score - a.score)
                  .map((a, i) => (
                    <li key={a.trail.id} className="flex items-center gap-3 px-3.5 py-2.5">
                      <span className="w-5 text-sm font-bold text-moss-700 tabular-nums">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{a.trail.name}</div>
                        <div className="text-xs text-muted truncate">{[a.trail.region, a.trail.country].filter(Boolean).join(", ")}</div>
                      </div>
                      <ScoreBadge score={a.score} size="sm" />
                    </li>
                  ))}
              </ol>
            )}

            {added.length === 0 && rankedCount > 0 && (
              <div className="rounded-xl bg-moss-50 border border-moss-200 px-4 py-3 text-sm mb-4">
                You’ve already ranked {rankedCount} {rankedCount === 1 ? "hike" : "hikes"}. Add more or continue.
              </div>
            )}

            <button type="button" onClick={() => setLogging(true)} className={cx(totalRanked === 0 ? "btn-primary" : "btn-secondary", "btn-lg w-full")}>
              {totalRanked === 0 ? "Add a hike you’ve done" : "Add another"}
            </button>

            <div className="flex justify-center gap-1.5 mt-4">
              {[0, 1, 2].map((i) => (
                <span key={i} className={cx("h-2 w-2 rounded-full", i < totalRanked ? "bg-moss-600" : "bg-stone-300")} />
              ))}
            </div>

            <div className="mt-auto pt-8 flex gap-2">
              <button type="button" onClick={back} className="btn-secondary btn-lg">
                Back
              </button>
              <button type="button" onClick={next} className={cx(totalRanked > 0 ? "btn-primary" : "btn-ghost", "btn-lg flex-1")}>
                {totalRanked > 0 ? "Continue" : "I’ll do this later"}
              </button>
            </div>
          </div>
        )}

        {step === "friends" && (
          <div className="flex-1 flex flex-col animate-fade-up">
            <h1 className="text-2xl font-bold tracking-tight mb-1">Find your hiking friends</h1>
            <p className="text-muted mb-5">traili is friends-only. Your feed is empty until someone you know is on it.</p>
            {friendCount > 0 && (
              <div className="rounded-xl bg-moss-50 border border-moss-200 px-4 py-3 text-sm mb-4">
                You’re already friends with {friendCount} {friendCount === 1 ? "person" : "people"} through your invite.
              </div>
            )}
            <UserSearch placeholder="Search by name or @username" />
            <div className="mt-5">
              <InviteLink url={inviteUrl} />
            </div>
            <div className="mt-auto pt-8 flex gap-2">
              <button type="button" onClick={back} className="btn-secondary btn-lg">
                Back
              </button>
              <button type="button" onClick={next} className="btn-primary btn-lg flex-1">
                Continue
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex-1 flex flex-col animate-fade-up">
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="h-20 w-20 rounded-full bg-moss-600 text-white flex items-center justify-center mb-6 animate-pop">
                <Check size={36} strokeWidth={3} />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight mb-3">You’re on the trail</h1>
              <p className="text-stone-600 text-lg max-w-sm">
                {totalRanked > 0
                  ? `${totalRanked} ${totalRanked === 1 ? "hike" : "hikes"} ranked. Every new one gets compared against these.`
                  : "Log your first hike whenever you’re ready — the + button is always there."}
              </p>
            </div>
            <button type="button" onClick={finish} disabled={pending} className="btn-primary btn-lg w-full">
              {pending && <Spinner className="border-white/40 border-t-white" />}
              Go to my feed
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
