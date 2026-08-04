import type { InputHTMLAttributes, ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  endAdornment?: ReactNode;
};

export default function TextField({ label, hint, endAdornment, id, className = "", ...props }: Props) {
  const inputId = id ?? props.name;
  return (
    <label htmlFor={inputId} className="block">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[13px] font-bold text-[var(--reader-text)]">{label}</span>
        {hint && <span className="text-xs text-[var(--reader-text-muted)]">{hint}</span>}
      </div>
      <div className="relative">
        <input
          id={inputId}
          className={`w-full rounded-sm border border-sand-300 bg-white px-4 py-2.5 font-medium text-[14px] text-[var(--reader-text)] outline-none transition-colors placeholder:text-sand-400 focus:border-brand-400 ${
            endAdornment ? "pr-11" : ""
          } ${className}`}
          {...props}
        />
        {endAdornment && <div className="absolute inset-y-0 right-3.5 flex items-center">{endAdornment}</div>}
      </div>
    </label>
  );
}
