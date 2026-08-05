"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Wordmark from "@/app/components/auth/Wordmark";
import SunriseMark from "@/app/components/auth/SunriseMark";
import AuthButton from "@/app/components/auth/AuthButton";
import BackArrow from "@/app/components/auth/BackArrow";
import TextField from "@/app/components/auth/TextField";
import PasswordField from "@/app/components/auth/PasswordField";

function QuotePanel({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col bg-sand-950 px-6 py-10 text-white shell:px-10 shell:py-14 ${className}`}>
      <Wordmark />
      <blockquote className="mt-6 font-serif text-2xl leading-[1.25] font-medium shell:mt-10 shell:text-[28px]">
        The decolonization of the mind is as necessary as the decolonization of the land.
      </blockquote>
      <div className="mt-4 text-xs font-bold tracking-[0.1em] text-brand-400">— FRANTZ FANON</div>
      <div className="flex-1" />
      <SunriseMark theme="dark" className="-mb-6 w-full max-w-xs self-center" />
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  return (
    <div className="w-full max-w-sm">
      {/* Same BackArrow as the signup/survey wizard's own StepHeader — login
          is the one auth screen a reader can also land on directly (its own
          link on the home feed/sidebar), but it should still feel like a
          step they can back out of, not a dead end. Goes to "/" (redirects
          to /home) rather than router.back(), same reasoning as signup's
          own first-step back: a direct/bookmarked visit has no in-app
          history to pop to. */}
      <BackArrow onClick={() => router.push("/")} className="-ml-2 mb-4" />
      <h1 className="font-serif text-3xl font-semibold text-[var(--reader-text)]">Welcome back.</h1>
      <p className="mt-2 font-literata text-[14px] font-medium text-[var(--reader-text-muted)]">Log in to continue your consciousness journey.</p>

      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          router.push("/home");
        }}
      >
        <TextField label="Email" name="email" type="email" placeholder="e.g. ama@example.com" />
        <div>
          <PasswordField label="Password" name="password" placeholder="Enter your password" />
          <div className="mt-2 text-right">
            <button type="button" className="cursor-pointer border-none bg-transparent p-0 text-xs font-bold text-brand-500">
              Forgot password?
            </button>
          </div>
        </div>

        <AuthButton type="submit">Log in</AuthButton>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--reader-border)]" />
        <span className="text-xs font-medium text-[var(--reader-text-muted)]">or</span>
        <div className="h-px flex-1 bg-[var(--reader-border)]" />
      </div>

      <p className="text-center text-[14px] text-[var(--reader-text-muted)]">
        New here?{" "}
        <Link href="/auth/signup" className="font-bold text-brand-500 no-underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      {/* Mobile: quote hero stacked above the form, one scrollable page. */}
      <div className="shell:hidden">
        <QuotePanel className="min-h-[46vh]" />
        <div className="flex justify-center px-6 py-10">
          <LoginForm />
        </div>
      </div>

      {/* Desktop: split panel — quote left, form right. */}
      <div className="hidden min-h-screen shell:flex">
        <QuotePanel className="w-[38%] flex-none" />
        <div className="flex flex-1 items-center justify-center bg-[var(--reader-bg)] px-12">
          <LoginForm />
        </div>
      </div>
    </>
  );
}
