import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { Logo } from "@/components/ui";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect(user.onboardedAt ? "/home" : "/onboarding");
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="px-5 py-5">
        <Logo size={24} />
      </header>
      <main className="flex-1 flex items-start md:items-center justify-center px-5 pb-12">
        <div className="w-full max-w-sm animate-fade-up">{children}</div>
      </main>
    </div>
  );
}
