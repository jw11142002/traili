import AuthForm from "@/components/AuthForm";
import { googleEnabled } from "@/lib/google";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight mb-1">Welcome back</h1>
      <p className="text-muted mb-6">Pick up where your list left off.</p>
      <AuthForm mode="login" googleEnabled={googleEnabled()} />
    </>
  );
}
