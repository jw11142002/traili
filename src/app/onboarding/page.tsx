import { redirect } from "next/navigation";
import Onboarding from "@/components/Onboarding";
import { requireUser } from "@/lib/session";
import { suggestUsername } from "@/lib/actions/profile";
import { requestAppUrl } from "@/lib/google";
import { getFriendIds } from "@/lib/queries";
import { db } from "@/lib/db";
import { parseJsonArray } from "@/lib/format";

export const metadata = { title: "Welcome" };
export const maxDuration = 60;

export default async function OnboardingPage() {
  const user = await requireUser({ allowUnonboarded: true });
  if (user.onboardedAt) redirect("/home");
  const [suggested, friends, rankedCount] = await Promise.all([
    user.username ? Promise.resolve(user.username) : suggestUsername(user.name),
    getFriendIds(user.id),
    db.userTrailRank.count({ where: { userId: user.id } }),
  ]);
  return (
    <Onboarding
      user={{
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        homePlace: user.homePlace,
        tastes: parseJsonArray(user.tastes),
        comfort: user.comfort,
      }}
      suggestedUsername={suggested}
      inviteUrl={`${await requestAppUrl()}/invite/${user.inviteCode}`}
      friendCount={friends.length}
      rankedCount={rankedCount}
    />
  );
}
