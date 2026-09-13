import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";

export default async function ProfileRedirect() {
  const user = await requireUser();
  redirect(user.username ? `/u/${user.username}` : "/settings");
}
