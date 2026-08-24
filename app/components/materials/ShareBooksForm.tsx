"use client";

import { useState } from "react";
import Link from "next/link";
import { type LucideIcon, Link as LinkIcon, Lightbulb } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useIsAuthenticated } from "@/lib/auth/useIsAuthenticated";
import SearchableAppPage from "@/app/components/shell/SearchableAppPage";
import TextField from "@/app/components/auth/TextField";
import AuthButton from "@/app/components/auth/AuthButton";

type ShareKind = "suggestion" | "link";

const shareOptions: Array<{ id: ShareKind; label: string; description: string; icon: LucideIcon }> = [
  { id: "suggestion", label: "Suggest a book", description: "Title and author", icon: Lightbulb },
  { id: "link", label: "Leave a public link", description: "Drive, Dropbox, and more", icon: LinkIcon },
];

export default function ShareBooksForm() {
  const [kind, setKind] = useState<ShareKind>("suggestion");
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAuthenticated = useIsAuthenticated();

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage(null);
    setIsSuccess(false);

    const formData = new FormData(form);
    formData.set("submissionType", kind === "link" ? "external_url" : kind);

    setIsSubmitting(true);
    try {
      const result = await apiFetch<{ items?: unknown[] }>("/pending-materials", { body: formData });

      const count = result.items?.length ?? 1;
      setMessage(count === 1 ? "Thank you — your submission is now waiting for review." : `Thank you — ${count} submissions are now waiting for review.`);
      setIsSuccess(true);
      form.reset();
      setKind("suggestion");
    } catch (submissionError) {
      setMessage(submissionError instanceof Error ? submissionError.message : "We could not submit this right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SearchableAppPage className="mx-auto max-w-2xl pb-12">
      <div className="mb-8">
        <h1 className="m-0 font-serif text-3xl font-semibold tracking-tight text-[var(--reader-text)]">Share books with comrades</h1>
        <p className="mt-3 mb-0 max-w-xl text-[14px] leading-relaxed text-[var(--reader-text-muted)]">
          Help grow the library. Recommend a title or leave a public link for the cadres to review.
        </p>
      </div>

      {!isAuthenticated ? (
        <div className="rounded-sm border border-[var(--reader-border)] bg-[var(--reader-surface)] p-3.5">
          <p className="m-0 mb-2 text-[14px] font-medium leading-relaxed text-[var(--reader-text-muted)]">Only members can share books.</p>
          <div className="flex gap-4">
            <Link href="/auth/login" className="text-[13px] font-bold text-[var(--reader-text-muted)] no-underline hover:text-[var(--reader-text)]">Log in</Link>
            <Link href="/auth/signup" className="text-[13px] font-bold text-[var(--reader-accent)] no-underline hover:opacity-80">Join us</Link>
          </div>
        </div>
      ) : <form onSubmit={onSubmit} className="rounded-sm border border-[var(--reader-border)] bg-[var(--reader-surface)] p-4 sm:p-6">
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-3 text-sm font-semibold text-[var(--reader-text)]">What would you like to share?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {shareOptions.map((option) => {
              const Icon = option.icon;
              const selected = kind === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setKind(option.id);
                    setMessage(null);
                    setIsSuccess(false);
                  }}
                  className={`cursor-pointer rounded-sm border p-3 text-left transition-colors ${
                    selected
                      ? "border-brand-500 bg-brand-500/10 text-[var(--reader-text)]"
                      : "border-[var(--reader-border)] text-[var(--reader-text-muted)] hover:bg-[var(--reader-surface-hover)]"
                  }`}
                >
                  <Icon size={18} className={selected ? "text-brand-500" : "text-[var(--reader-text-subtle)]"} />
                  <span className="mt-2 block text-sm font-semibold">{option.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed">{option.description}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-6 border-t border-[var(--reader-border)] pt-5">
          {kind === "suggestion" && (
            <div className="space-y-4">
              <TextField required name="title" label="Book title *" placeholder="e.g. How Europe Underdeveloped Africa" />
              <TextField name="author" label="Author" hint="Optional" placeholder="e.g. Walter Rodney" />
            </div>
          )}

          {kind === "link" && (
            <div>
              <TextField required name="sourceUrl" type="url" label="Public download link *" placeholder="Google Drive, Dropbox, or another public URL" />
              <p className="mb-0 mt-2 text-xs leading-relaxed text-[var(--reader-text-muted)]">Make sure anyone with the link can open it. For now, the library team will download and review linked files manually.</p>
            </div>
          )}
        </div>

        {message && (
          <p role="status" className={`mt-4 mb-0 rounded-md px-3 py-2 text-sm ${isSuccess ? "bg-emerald-500/10 text-[var(--reader-text)]" : "bg-brand-500/10 text-[var(--reader-text)]"}`}>
            {message}
          </p>
        )}

        <AuthButton type="submit" fullWidth={false} disabled={isSubmitting} className="mt-6">
          {isSubmitting ? "Submitting…" : "Submit for review"}
        </AuthButton>
      </form>}
    </SearchableAppPage>
  );
}
