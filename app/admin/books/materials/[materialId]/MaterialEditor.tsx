"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TextField from "@/app/components/auth/TextField";
import AuthButton from "@/app/components/auth/AuthButton";
import type { Database } from "@/lib/supabase/database.types";

type Material = Database["public"]["Tables"]["materials"]["Row"];

const nullable = (value: string) => value.trim() || null;
const nullableNumber = (value: string) => value.trim() ? Number(value) : null;

export default function MaterialEditor({ material }: { material: Material }) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus("saving");
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/materials/${material.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.get("title"), author: data.get("author"), description: nullable(String(data.get("description") ?? "")),
          language: nullable(String(data.get("language") ?? "")), materialType: data.get("materialType"), status: data.get("status"),
          publishedYear: nullableNumber(String(data.get("publishedYear") ?? "")), pageCountEstimate: nullableNumber(String(data.get("pageCountEstimate") ?? "")),
          categories: String(data.get("categories") ?? "").split(",").map((category) => category.trim()).filter(Boolean),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "We could not update this book.");
      setStatus("saved");
      setMessage("Book details saved.");
    } catch (updateError) {
      setStatus("error");
      setMessage(updateError instanceof Error ? updateError.message : "We could not update this book.");
    }
  };

  return (
    <>
      <Link href="/admin/books" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--reader-text-muted)] no-underline hover:text-[var(--reader-text)]"><ArrowLeft size={16} /> All books</Link>
      <header className="mt-6 mb-7"><p className="mb-2 text-sm font-semibold text-brand-500">Library book</p><h1 className="m-0 font-serif text-3xl font-semibold tracking-tight text-[var(--reader-text)]">Edit book details</h1></header>
      <form onSubmit={onSubmit} className="space-y-5">
        <TextField label="Title" name="title" required defaultValue={material.title} />
        <TextField label="Author" name="author" required defaultValue={material.author} />
        <label className="block">
          <span className="mb-2 block text-[13px] font-bold text-[var(--reader-text)]">Description</span>
          <textarea name="description" defaultValue={material.description ?? ""} rows={5} className="w-full rounded-sm border border-sand-300 bg-[var(--reader-surface)] px-4 py-2.5 text-[14px] font-medium text-[var(--reader-text)] outline-none transition-colors focus:border-brand-400" />
        </label>
        <TextField label="Material type" name="materialType" required defaultValue={material.material_type} />
        <TextField label="Language" name="language" defaultValue={material.language ?? ""} />
        <TextField label="Published year" name="publishedYear" type="number" defaultValue={material.published_year?.toString() ?? ""} />
        <TextField label="Estimated pages" name="pageCountEstimate" type="number" defaultValue={material.page_count_estimate?.toString() ?? ""} />
        <TextField label="Categories" name="categories" defaultValue={(material.categories as string[]).join(", ")} hint="Separate categories with commas." />
        <label className="block"><span className="mb-2 block text-[13px] font-bold text-[var(--reader-text)]">Library status</span><select name="status" defaultValue={material.status} className="w-full rounded-sm border border-sand-300 bg-[var(--reader-surface)] px-4 py-2.5 text-[14px] font-medium text-[var(--reader-text)] outline-none transition-colors focus:border-brand-400"><option value="published">Published</option><option value="draft">Draft</option></select></label>
        {message && <p role="status" className={`m-0 rounded-md px-3 py-2 text-sm ${status === "error" ? "bg-brand-500/10" : "bg-emerald-500/10"}`}>{message}</p>}
        <AuthButton type="submit" fullWidth={false} disabled={status === "saving"}>{status === "saving" ? "Saving…" : "Save changes"}</AuthButton>
      </form>
    </>
  );
}
