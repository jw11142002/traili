import AppShell from "@/components/AppShell";
import { requireUser } from "@/lib/session";
import { getPendingRequestCount } from "@/lib/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const pending = await getPendingRequestCount(user.id);
  return (
    <AppShell user={{ name: user.name, username: user.username, avatarUrl: user.avatarUrl }} pendingRequests={pending}>
      {children}
    </AppShell>
  );
}
