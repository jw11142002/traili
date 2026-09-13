import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ListOrdered, Users, Mountain, Scale } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { Logo, ScoreBadge } from "@/components/ui";

export default async function Landing() {
  const user = await getCurrentUser();
  if (user) redirect(user.onboardedAt ? "/home" : "/onboarding");

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="mx-auto w-full max-w-5xl px-5 py-5 flex items-center justify-between">
        <Logo size={24} />
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary">
            Get started
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-5 pt-10 pb-16 md:pt-20 md:pb-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-moss-700 mb-3">Beli, for trails</p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05] mb-5">
              Rank every hike you’ve ever done.
            </h1>
            <p className="text-lg text-stone-600 mb-8 max-w-md">
              Not stars. Not strangers’ reviews. Your own ranked list, built from quick “which did you prefer?” calls — and your friends’ lists next to it.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className="btn-primary btn-lg">
                Start your list <ArrowRight size={18} />
              </Link>
              <Link href="/login" className="btn-secondary btn-lg">
                I have an account
              </Link>
            </div>
          </div>

          <div className="card p-4 shadow-soft md:justify-self-end w-full max-w-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted px-1 mb-2">Justin’s hikes</div>
            <ol className="divide-y divide-line">
              {[
                ["Tre Cime di Lavaredo", "Dolomites, Italy", 9.6],
                ["Angels Landing", "Utah, US", 9.2],
                ["Lake Serene", "Washington, US", 8.4],
                ["Seceda Ridgeline", "Dolomites, Italy", 8.1],
                ["Rattlesnake Ledge", "Washington, US", 5.9],
              ].map(([name, place, score], i) => (
                <li key={String(name)} className="flex items-center gap-3 py-2.5 px-1">
                  <span className="w-5 text-sm font-bold text-moss-700 tabular-nums">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{name}</div>
                    <div className="text-xs text-muted">{place}</div>
                  </div>
                  <ScoreBadge score={Number(score)} size="sm" />
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-white border-y border-line">
          <div className="mx-auto max-w-5xl px-5 py-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              [Scale, "Compare, don’t rate", "Tell us how it felt, then answer a few head-to-heads. We place it on your list with a score."],
              [ListOrdered, "One list that’s yours", "Drag to reorder, nudge a 9.5 to a 9.3. Every hike keeps its place until you change your mind."],
              [Users, "Friends only", "No global feed. See what the people you actually hike with ranked, wanted, and re-hiked."],
              [Mountain, "Any trail on earth", "Search OpenStreetMap — from Zion to the Dolomites. Can’t find it? Add it in ten seconds."],
            ].map(([Icon, title, body]) => {
              const I = Icon as typeof Scale;
              return (
                <div key={String(title)}>
                  <div className="h-10 w-10 rounded-xl bg-moss-50 text-moss-700 flex items-center justify-center mb-3">
                    <I size={20} />
                  </div>
                  <h3 className="font-semibold mb-1">{String(title)}</h3>
                  <p className="text-sm text-stone-600">{String(body)}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-5 py-8 text-xs text-muted flex flex-wrap gap-x-4 gap-y-1">
        <span>© {new Date().getFullYear()} traili</span>
        <span>
          Trail data © <a href="https://www.openstreetmap.org/copyright" className="underline underline-offset-2">OpenStreetMap</a> contributors
        </span>
      </footer>
    </div>
  );
}
