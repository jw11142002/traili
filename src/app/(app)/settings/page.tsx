import { requireUser } from "@/lib/session";
import { parseJsonArray } from "@/lib/format";
import SettingsForm from "@/components/SettingsForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="animate-fade-up max-w-lg">
      <h1 className="text-2xl font-bold tracking-tight mb-5">Settings</h1>
      <SettingsForm
        user={{
          name: user.name,
          username: user.username,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
          homePlace: user.homePlace,
          tastes: parseJsonArray(user.tastes),
          comfort: user.comfort,
          email: user.email,
        }}
      />
    </div>
  );
}
