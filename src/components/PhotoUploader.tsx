"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, X } from "lucide-react";
import { addPhotos, deletePhoto } from "@/lib/actions/photos";
import { Spinner } from "./ui";

type Photo = { id: string; url: string };

export default function PhotoUploader({ visitId, initial = [], onChange }: { visitId: string; initial?: Photo[]; onChange?: (photos: Photo[]) => void }) {
  const [photos, setPhotos] = useState<Photo[]>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fd = new FormData();
    fd.set("visitId", visitId);
    Array.from(files).forEach((f) => fd.append("files", f));
    setError(null);
    start(async () => {
      const res = await addPhotos(fd);
      if (res.error) setError(res.error);
      if (res.photos) {
        const next = [...photos, ...res.photos];
        setPhotos(next);
        onChange?.(next);
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  };

  const remove = (id: string) => {
    const next = photos.filter((p) => p.id !== id);
    setPhotos(next);
    onChange?.(next);
    start(async () => {
      await deletePhoto(id);
    });
  };

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {photos.map((p) => (
          <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(p.id)}
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center"
              aria-label="Remove photo"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="aspect-square rounded-xl border-2 border-dashed border-line bg-white hover:bg-stone-50 flex flex-col items-center justify-center gap-1 text-muted text-xs font-medium"
        >
          {pending ? <Spinner /> : <Camera size={22} />}
          {pending ? "Uploading" : "Add"}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
      {error && <p className="text-sm text-rust-600 mt-2">{error}</p>}
    </div>
  );
}
