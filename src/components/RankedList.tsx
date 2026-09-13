"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Minus, Plus, Search, Trash2 } from "lucide-react";
import { moveRank, removeRank, setScore } from "@/lib/actions/ranks";
import { bucketForScore, clampScore, formatScore, effortBand } from "@/lib/ranking";
import { fmtDistance } from "@/lib/format";
import { ScoreBadge, TrailThumb, cx } from "./ui";

export type RankedRow = {
  id: string;
  trailId: string;
  name: string;
  region: string | null;
  country: string | null;
  kind: string | null;
  difficulty: string | null;
  distanceKm: number | null;
  score: number;
  photo: string | null;
};

export default function RankedList({ rows: initial, editable = true }: { rows: RankedRow[]; editable?: boolean }) {
  const [rows, setRows] = useState(initial);
  // Keep in sync when the server re-renders with fresh scores (e.g. after a respread).
  useEffect(() => setRows(initial), [initial]);
  const [editing, setEditing] = useState<string | null>(null);
  const [filterEffort, setFilterEffort] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [, start] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => (!filterEffort || effortBand(r.difficulty) === filterEffort) && (!needle || r.name.toLowerCase().includes(needle) || (r.region ?? "").toLowerCase().includes(needle)));
  }, [rows, filterEffort, q]);
  const isFiltered = Boolean(filterEffort || q.trim());
  const canDrag = editable && !isFiltered;

  const sortByScore = (list: RankedRow[]) => [...list].sort((a, b) => b.score - a.score);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    const moved = arrayMove(rows, oldIndex, newIndex);
    const above = newIndex > 0 ? moved[newIndex - 1] : null;
    const below = newIndex < moved.length - 1 ? moved[newIndex + 1] : null;
    // Optimistic score: midpoint between new neighbours.
    const guess = above && below ? (above.score + below.score) / 2 : above ? Math.max(1, above.score - 0.3) : below ? Math.min(10, below.score + 0.3) : 5.5;
    setRows(moved.map((r) => (r.id === active.id ? { ...r, score: clampScore(guess) } : r)));
    start(async () => {
      const res = await moveRank(String(active.id), above?.id ?? null, below?.id ?? null);
      if (res.score != null) setRows((cur) => sortByScore(cur.map((r) => (r.id === active.id ? { ...r, score: res.score! } : r))));
    });
  };

  const changeScore = (id: string, next: number) => {
    const s = clampScore(next);
    setRows((cur) => sortByScore(cur.map((r) => (r.id === id ? { ...r, score: s } : r))));
    start(async () => {
      await setScore(id, s);
    });
  };

  const remove = (id: string) => {
    if (!confirm("Remove this hike and its visits from your list?")) return;
    setRows((cur) => cur.filter((r) => r.id !== id));
    setEditing(null);
    start(async () => {
      await removeRank(id);
    });
  };

  if (rows.length === 0) return null;

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter your list" className="input pl-9 py-2" />
        </div>
        <div className="flex rounded-xl border border-line bg-white p-1 text-sm">
          {[
            [null, "All"],
            ["easy", "Easy"],
            ["moderate", "Mod"],
            ["hard", "Hard"],
          ].map(([id, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => setFilterEffort(id as string | null)}
              className={cx("rounded-lg px-2.5 py-1 font-medium", filterEffort === id ? "bg-moss-600 text-white" : "text-stone-600 hover:bg-stone-50")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {editable && (
        <p className="text-xs text-muted mb-2">{canDrag ? "Hold the handle to drag. Tap a score to nudge it." : "Clear filters to drag and reorder."}</p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
        <SortableContext items={filtered.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <ol className="card divide-y divide-line overflow-hidden">
            {filtered.map((row) => (
              <Row
                key={row.id}
                row={row}
                position={rows.findIndex((r) => r.id === row.id) + 1}
                canDrag={canDrag}
                editable={editable}
                editing={editing === row.id}
                onEdit={() => setEditing(editing === row.id ? null : row.id)}
                onScore={(s) => changeScore(row.id, s)}
                onRemove={() => remove(row.id)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {filtered.length === 0 && <p className="text-center text-sm text-muted py-6">No hikes match.</p>}
    </div>
  );
}

function ScoreInput({ score, onCommit }: { score: number; onCommit: (s: number) => void }) {
  const [draft, setDraft] = useState(formatScore(score));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setDraft(formatScore(score)), [score]);
  const commit = (raw: string, immediate: boolean) => {
    if (timer.current) clearTimeout(timer.current);
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n < 1 || n > 10) {
      if (immediate) setDraft(formatScore(score));
      return;
    }
    const run = () => {
      if (Math.abs(n - score) > 0.001) onCommit(n);
    };
    if (immediate) run();
    else timer.current = setTimeout(run, 600);
  };
  return (
    <input
      value={draft}
      inputMode="decimal"
      onChange={(e) => {
        setDraft(e.target.value);
        commit(e.target.value, false);
      }}
      onBlur={(e) => commit(e.target.value, true)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="input text-center font-bold tabular-nums w-24 py-2"
    />
  );
}

function Row({
  row,
  position,
  canDrag,
  editable,
  editing,
  onEdit,
  onScore,
  onRemove,
}: {
  row: RankedRow;
  position: number;
  canDrag: boolean;
  editable: boolean;
  editing: boolean;
  onEdit: () => void;
  onScore: (s: number) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: row.id, disabled: !canDrag });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const tone = bucketForScore(row.score);

  return (
    <li ref={setNodeRef} style={style} className={cx("bg-white", isDragging && "relative z-10 shadow-lift")}>
      <div className="flex items-center gap-2 pl-2 pr-3 py-2.5">
        {canDrag ? (
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="h-9 w-7 flex items-center justify-center text-stone-300 hover:text-stone-500 cursor-grab active:cursor-grabbing touch-none"
            aria-label="Drag to reorder"
          >
            <GripVertical size={18} />
          </button>
        ) : (
          <div className="w-2" />
        )}
        <span className={cx("w-7 text-right text-sm font-bold tabular-nums", tone === "liked" ? "text-moss-700" : tone === "fine" ? "text-amber-600" : "text-rust-600")}>{position}</span>
        <Link href={`/trails/${row.trailId}`} className="flex items-center gap-3 min-w-0 flex-1 py-0.5">
          <TrailThumb photo={row.photo} kind={row.kind} size={44} />
          <div className="min-w-0">
            <div className="font-semibold truncate">{row.name}</div>
            <div className="text-sm text-muted truncate">
              {[row.region, row.country].filter(Boolean).join(", ")}
              {row.distanceKm != null && ` · ${fmtDistance(row.distanceKm)}`}
            </div>
          </div>
        </Link>
        {editable ? (
          <button type="button" onClick={onEdit} aria-label="Edit score">
            <ScoreBadge score={row.score} />
          </button>
        ) : (
          <ScoreBadge score={row.score} />
        )}
      </div>
      {editing && (
        <div className="flex items-center gap-2 px-4 pb-3 pt-1 animate-fade-up">
          <button type="button" onClick={() => onScore(Math.round((row.score - 0.1) * 10) / 10)} className="btn-secondary h-10 w-10 p-0 rounded-full" aria-label="Lower">
            <Minus size={16} />
          </button>
          <ScoreInput score={row.score} onCommit={onScore} />
          <button type="button" onClick={() => onScore(Math.round((row.score + 0.1) * 10) / 10)} className="btn-secondary h-10 w-10 p-0 rounded-full" aria-label="Raise">
            <Plus size={16} />
          </button>
          <span className="flex-1" />
          <button type="button" onClick={onRemove} className="btn-ghost text-rust-600 hover:bg-rust-500/10 px-3" aria-label="Remove">
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </li>
  );
}
