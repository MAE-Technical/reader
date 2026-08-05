"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import TextField from "./TextField";
import type { InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string; error?: string };

export default function PasswordField({ label, error, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      label={label}
      error={error}
      type={visible ? "text" : "password"}
      endAdornment={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="cursor-pointer border-none bg-transparent p-0 text-sand-500 hover:text-[var(--reader-text)]"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      }
      {...props}
    />
  );
}
