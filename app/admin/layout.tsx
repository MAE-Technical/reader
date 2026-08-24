import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-5xl px-5 py-8 shell:px-10">{children}</main>;
}
