"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check } from "lucide-react";
import { checkUsername, updateProfile } from "@/lib/actions/profile";
import { addPhotos } from "@/lib/actions/photos";
import { deleteAccount, logout } from "@/lib/actions/auth";
import { TASTES, COMFORT } from "@/lib/constants";
import type { PlaceResult } from "@/lib/trails";
import PlacePicker from "./PlacePicker";
import { Avatar, Spinner, cx } from "./ui";

type Props = {
  user: { name: string; username: string | null; bio: string | null; avatarUrl: string | null; homePlace: string | null; tastes: string[]; comfort: string | null; email: string };
};

export default function SettingsForm({ user }: Props) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username ?? "");
  const [usernameState, setUsernameState] = useState<{ ok: boolean; reason?: string } | null>(null);
  const [bio, setBio] = useState(user.bio ?? "");
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [clearHome, setClearHome] = useState(false);
  const [tastes, setTastes] = useState<string[]>(user.tastes);
  const [comfort, setComfort] = useState<string | null>(user.comfort);
  const [avatar, setAvatar] = useState(user.avatarUrl);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (username === user.username) return setUsernameState(null);
    const t = setTimeout(async () => setUsernameState(await checkUsername(username)), 350);
    return () => clearTimeout(t);
  }, [username, user.username]);

  const save = () => {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateProfile({
        name,
        username,
        bio,
        tastes,
        comfort,
        ...(place ? { homePlace: [place.name, place.region].filter(Boolean).join(", "), homeLat: place.lat, homeLng: place.lng } : clearHome ? { homePlace: null, homeLat: null, homeLng: null } : {}),
      });
      if (res.error) setError(res.error);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => fileRef.current?.click()} className="relative" aria-label="Change photo">
          <Avatar name={name} src={avatar} size={72} />
          <span className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-moss-600 text-white flex items-center justify-center ring-2 ring-white">
            <Camera size={14} />
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const fd = new FormData();
            fd.set("kind", "avatar");
            fd.append("files", f);
            start(async () => {
              const r = await addPhotos(fd);
              if (r.photos?.[0]) setAvatar(r.photos[0].url);
              router.refresh();
            });
          }}
        />
        <div className="text-sm text-muted">{user.email}</div>
      </div>

      <div className="grid gap-4">
        <div>
          <label className="label">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Username</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">@</span>
            <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} className="input pl-8 pr-9" />
            {usernameState?.ok && <Check size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-moss-600" />}
          </div>
          {usernameState && !usernameState.ok && <p className="text-xs text-rust-600 mt-1">{usernameState.reason}</p>}
        </div>
        <div>
          <label className="label">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} className="input resize-none" maxLength={200} placeholder="Weekend peak-bagger. Will hike for pastries." />
        </div>
        <div>
          <label className="label">Home base</label>
          {!place && user.homePlace && !clearHome ? (
            <div className="flex items-center justify-between rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px]">
              <span>{user.homePlace}</span>
              <button type="button" onClick={() => setClearHome(true)} className="text-sm text-muted hover:text-ink">
                Change
              </button>
            </div>
          ) : (
            <PlacePicker value={place} onChange={setPlace} />
          )}
        </div>
      </div>

      <div>
        <label className="label">What you love</label>
        <div className="flex flex-wrap gap-2">
          {TASTES.map((t) => {
            const on = tastes.includes(t.id);
            return (
              <button key={t.id} type="button" onClick={() => setTastes(on ? tastes.filter((x) => x !== t.id) : [...tastes, t.id])} className={on ? "chip-on" : "chip-off"}>
                {t.emoji} {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label className="label">Sweet spot</label>
        <div className="grid grid-cols-2 gap-2">
          {COMFORT.map((c) => (
            <button key={c.id} type="button" onClick={() => setComfort(c.id)} className={cx("card text-left px-3.5 py-2.5", comfort === c.id ? "border-moss-600 bg-moss-50" : "hover:bg-stone-50")}>
              <div className="font-semibold text-sm">{c.label}</div>
              <div className="text-xs text-muted">{c.detail}</div>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-rust-600">{error}</p>}
      <button type="button" onClick={save} disabled={pending || usernameState?.ok === false} className="btn-primary btn-lg">
        {pending ? <Spinner className="border-white/40 border-t-white" /> : saved ? <Check size={18} /> : null}
        {saved ? "Saved" : "Save changes"}
      </button>

      <div className="border-t border-line pt-6 flex flex-col gap-3">
        <form action={logout}>
          <button type="submit" className="btn-secondary w-full">
            Log out
          </button>
        </form>
        <form
          action={deleteAccount}
          onSubmit={(e) => {
            if (!confirm("Delete your account and everything on your list? This can't be undone.")) e.preventDefault();
          }}
        >
          <button type="submit" className="btn-ghost w-full text-rust-600 hover:bg-rust-500/10">
            Delete account
          </button>
        </form>
      </div>
    </div>
  );
}
