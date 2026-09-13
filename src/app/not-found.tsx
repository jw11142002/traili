import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center text-center px-5 gap-4">
      <Logo size={24} />
      <h1 className="text-2xl font-bold tracking-tight">Off the trail</h1>
      <p className="text-muted max-w-xs">That page doesn’t exist. Maybe it was never mapped.</p>
      <Link href="/" className="btn-primary">
        Back home
      </Link>
    </div>
  );
}
