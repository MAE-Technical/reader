"use client";

import { BookOpen } from "lucide-react";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  imageClassName?: string;
  iconSize?: number;
};

export default function BookCover({ src, alt, className = "", imageClassName = "", iconSize = 22 }: Props) {
  const resolvedSrc = src?.trim() || undefined;

  return (
    <div className={`relative overflow-hidden bg-[var(--reader-surface-hover)] ${className}`}>
      {resolvedSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- content-library thumbnail, not an app asset
        <img
          src={resolvedSrc}
          alt={alt}
          className={`absolute inset-0 h-full w-full object-cover ${imageClassName}`}
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center text-[var(--reader-text-muted)]"
        >
          <BookOpen size={iconSize} strokeWidth={1.75} />
        </div>
      )}
    </div>
  );
}
