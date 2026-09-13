import { cookies } from "next/headers";
import AuthForm from "@/components/AuthForm";
import { googleEnabled } from "@/lib/google";
import { INVITE_COOKIE } from "@/lib/invites";
import { db } from "@/lib/db";
import { Avatar } from "@/components/ui";

export const metadata = { title: "Create account" };

export default async function SignupPage() {
  const jar = await cookies();
  const code = jar.get(INVITE_COOKIE)?.value;
  const inviter = code ? await db.user.findUnique({ where: { inviteCode: code }, select: { name: true, avatarUrl: true } }) : null;

  return (
    <>
      {inviter && (
        <div className="flex items-center gap-3 rounded-2xl bg-moss-50 border border-moss-200 px-4 py-3 mb-6">
          <Avatar name={inviter.name} src={inviter.avatarUrl} size={36} />
          <p className="text-sm">
            <span className="font-semibold">{inviter.name}</span> invited you. You’ll be friends as soon as you join.
          </p>
        </div>
      )}
      <h1 className="text-2xl font-bold tracking-tight mb-1">Start your list</h1>
      <p className="text-muted mb-6">Two minutes to set up. Then rank your first hike.</p>
      <AuthForm mode="signup" googleEnabled={googleEnabled()} />
    </>
  );
}
