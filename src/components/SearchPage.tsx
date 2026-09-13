"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ensureTrail } from "@/lib/actions/trails";
import TrailSearch from "./TrailSearch";
import ManualTrailForm from "./ManualTrailForm";
import { Spinner } from "./ui";

export default function SearchPage() {
  const router = useRouter();
  const [manual, setManual] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (manual !== null) {
    return (
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Add a trail</h1>
        <p className="text-muted text-sm mb-5">It’ll be searchable for your friends too.</p>
        <ManualTrailForm initialName={manual} onCancel={() => setManual(null)} onCreated={(id) => router.push(`/trails/${id}`)} />
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Search</h1>
      <p className="text-muted text-sm mb-4">Any trail, summit, or lake on the map.</p>
      <TrailSearch
        autoFocus
        onPick={(hit) => {
          if (hit.trailId) return router.push(`/trails/${hit.trailId}`);
          start(async () => {
            const { trailId } = await ensureTrail(hit);
            router.push(`/trails/${trailId}`);
          });
        }}
        onManual={(q) => setManual(q)}
      />
      {pending && (
        <div className="flex items-center gap-2 text-sm text-muted mt-4">
          <Spinner /> Pulling trail details from OpenStreetMap…
        </div>
      )}
    </div>
  );
}
