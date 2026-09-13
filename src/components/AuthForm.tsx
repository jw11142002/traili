"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, signup, type AuthState } from "@/lib/actions/auth";
import { Spinner } from "./ui";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.6 30.1 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.8 6C12.4 13.1 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.8-.4-4H24v8.1h12.7c-.3 2.1-1.7 5.3-4.8 7.4l7.4 5.7c4.4-4.1 7.2-10.1 7.2-17.2z" />
      <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.7 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2 1.4-4.8 2.4-8.5 2.4-6.3 0-11.6-3.6-13.5-8.7l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export default function AuthForm({ mode, googleEnabled }: { mode: "login" | "signup"; googleEnabled: boolean }) {
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, undefined);

  return (
    <div className="w-full">
      {googleEnabled && (
        <>
          <a href="/api/auth/google" className="btn-secondary btn-lg w-full">
            <GoogleIcon /> Continue with Google
          </a>
          <div className="flex items-center gap-3 my-5 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            or with email
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}
      <form action={formAction} className="flex flex-col gap-3">
        {mode === "signup" && (
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input id="name" name="name" required autoComplete="name" className="input" placeholder="What friends call you" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" placeholder="you@example.com" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="input"
            placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
          />
        </div>
        {state?.error && <p className="text-sm text-rust-600">{state.error}</p>}
        <button type="submit" disabled={pending} className="btn-primary btn-lg mt-1">
          {pending && <Spinner className="border-white/40 border-t-white" />}
          {mode === "signup" ? "Create account" : "Log in"}
        </button>
      </form>
      <p className="text-sm text-muted text-center mt-6">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-moss-700">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="font-semibold text-moss-700">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
