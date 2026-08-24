"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import { deletePendingMaterial } from "./actions";
import type { PendingMaterial } from "@/lib/materials/pending";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export default function PendingMaterialsTable({ materials }: { materials: PendingMaterial[] }) {
  const [items, setItems] = useState(materials);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const onDelete = (id: string) => {
    setError(null);
    setRemovingId(id);
    startTransition(async () => {
      const result = await deletePendingMaterial(id);
      setRemovingId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItems((current) => current.filter((item) => item.id !== id));
    });
  };

  if (items.length === 0) {
    return <p className="m-0 py-8 text-center text-sm text-[var(--reader-text-muted)]">No submissions are waiting for review.</p>;
  }

  return (
    <div>
      {error && <p role="alert" className="m-0 border-b border-[var(--reader-border)] py-3 text-sm text-brand-500">{error}</p>}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-5 border-b border-[var(--reader-border)] py-3 text-xs font-semibold text-[var(--reader-text-subtle)] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto]">
        <span>Title</span>
        <span className="hidden sm:block">Submitted by</span>
        <span>Submitted</span>
        <span className="sr-only">Actions</span>
      </div>
      {items.map((item) => {
        const isRemoving = removingId === item.id;
        return (
          <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-5 border-b border-[var(--reader-border)] py-4 last:border-b-0 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto]">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-[var(--reader-text)]">{item.title}</span>
              <span className="mt-1 block truncate text-sm text-[var(--reader-text-muted)] sm:hidden">{item.submitterPseudonym || "Anonymous"}</span>
            </span>
            <span className="hidden truncate text-sm text-[var(--reader-text-muted)] sm:block">{item.submitterPseudonym || "Anonymous"}</span>
            <span className="text-right text-xs text-[var(--reader-text-subtle)]">{formatDate(item.created_at)}</span>
            <span className="flex items-center gap-2">
              {item.source_url && <a href={item.source_url} target="_blank" rel="noreferrer" aria-label={`Open public link for ${item.title}`} className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-[var(--reader-text-muted)] hover:bg-[var(--reader-surface-hover)] hover:text-[var(--reader-text)]"><ExternalLink size={15} /></a>}
              <button type="button" onClick={() => onDelete(item.id)} disabled={isRemoving} aria-label={`Delete ${item.title}`} className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-[var(--reader-text-muted)] hover:bg-brand-500/10 hover:text-brand-500 disabled:cursor-not-allowed disabled:opacity-50">
                {isRemoving ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
}
