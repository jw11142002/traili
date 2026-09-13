"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Plus, ListOrdered, Users, Settings } from "lucide-react";
import { Avatar, Logo, cx } from "./ui";

type Props = {
  user: { name: string; username: string | null; avatarUrl: string | null };
  pendingRequests: number;
  children: React.ReactNode;
};

export default function AppShell({ user, pendingRequests, children }: Props) {
  const pathname = usePathname();
  const profileHref = user.username ? `/u/${user.username}` : "/settings";
  const items = [
    { href: "/home", label: "Home", icon: Home },
    { href: "/search", label: "Search", icon: Search },
    { href: "/log", label: "Log", icon: Plus, primary: true },
    { href: "/lists", label: "Lists", icon: ListOrdered },
    { href: profileHref, label: "You", icon: null },
  ];
  const isActive = (href: string) => pathname === href || (href !== "/home" && pathname.startsWith(href + "/")) || (href.startsWith("/u/") && pathname === href);
  const isLogFlow = pathname.startsWith("/log");

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 lg:w-64 shrink-0 border-r border-line bg-white/70 backdrop-blur sticky top-0 h-dvh px-4 py-6">
        <Logo className="px-2 mb-8" />
        <nav className="flex flex-col gap-1">
          {items.map((it) => {
            const active = isActive(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors",
                  it.primary ? "bg-moss-600 text-white hover:bg-moss-700 my-2" : active ? "bg-moss-50 text-moss-800" : "text-stone-700 hover:bg-stone-100",
                )}
              >
                {it.icon ? <it.icon size={20} /> : <Avatar name={user.name} src={user.avatarUrl} size={22} />}
                {it.primary ? "Log a hike" : it.label}
              </Link>
            );
          })}
          <Link
            href="/friends"
            className={cx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors",
              isActive("/friends") ? "bg-moss-50 text-moss-800" : "text-stone-700 hover:bg-stone-100",
            )}
          >
            <Users size={20} />
            Friends
            {pendingRequests > 0 && (
              <span className="ml-auto rounded-full bg-clay-500 text-white text-xs font-bold px-2 py-0.5">{pendingRequests}</span>
            )}
          </Link>
        </nav>
        <div className="mt-auto">
          <Link href="/settings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-stone-600 hover:bg-stone-100">
            <Settings size={20} />
            Settings
          </Link>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <main className={cx("mx-auto w-full max-w-2xl px-4 pt-4 md:pt-8 md:px-8", isLogFlow ? "pb-6" : "pb-28 md:pb-12")}>{children}</main>
      </div>

      {/* Mobile bottom nav */}
      {!isLogFlow && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-white/95 backdrop-blur pb-safe">
          <div className="grid grid-cols-5 h-16">
            {items.map((it) => {
              const active = isActive(it.href);
              if (it.primary) {
                return (
                  <Link key={it.href} href={it.href} className="flex items-center justify-center" aria-label="Log a hike">
                    <span className="flex h-12 w-12 -mt-5 items-center justify-center rounded-full bg-moss-600 text-white shadow-lift">
                      <Plus size={26} strokeWidth={2.5} />
                    </span>
                  </Link>
                );
              }
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cx("flex flex-col items-center justify-center gap-1 text-[11px] font-medium relative", active ? "text-moss-700" : "text-stone-500")}
                >
                  {it.icon ? (
                    <it.icon size={22} strokeWidth={active ? 2.4 : 2} />
                  ) : (
                    <span className={cx("rounded-full", active && "ring-2 ring-moss-600 ring-offset-1")}>
                      <Avatar name={user.name} src={user.avatarUrl} size={24} />
                    </span>
                  )}
                  {it.label}
                  {it.label === "You" && pendingRequests > 0 && (
                    <span className="absolute top-2 right-1/2 -mr-5 h-2.5 w-2.5 rounded-full bg-clay-500 ring-2 ring-white" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
