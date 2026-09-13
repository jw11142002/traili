import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import LogFlow from "@/components/LogFlow";

export const metadata = { title: "Log a hike" };

export default async function LogPage({ searchParams }: { searchParams: Promise<{ trail?: string }> }) {
  await requireUser();
  const { trail: trailId } = await searchParams;
  const trail = trailId
    ? await db.trail.findUnique({
        where: { id: trailId },
        select: { id: true, name: true, region: true, country: true, difficulty: true, kind: true, distanceKm: true },
      })
    : null;
  return (
    <div className="max-w-md mx-auto">
      <LogFlow key={trail?.id ?? "new"} initialTrail={trail} />
    </div>
  );
}
