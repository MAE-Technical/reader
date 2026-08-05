import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline";
  fullWidth?: boolean;
};

/**
 * The one button style used across every onboarding screen — solid rust for
 * primary CTAs (Continue / Log in / Create my account / Enter Ominira),
 * outline for the dark hero's secondary action (Join the movement).
 */
export default function AuthButton({ variant = "solid", fullWidth = true, className = "", ...props }: Props) {
  const styles =
    variant === "solid"
      ? "border-brand-500 bg-brand-500 text-white hover:bg-brand-600"
      : "border-[var(--reader-border)] bg-white text-brand-400 hover:bg-white/95";
  return (
    <button
      className={`cursor-pointer rounded-sm border px-4 py-2 text-[14px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        fullWidth ? "w-full" : "w-auto"
      } ${styles} ${className}`}
      {...props}
    />
  );
}
