"use client";

import * as Popover from "@radix-ui/react-popover";
import { Bell } from "lucide-react";
import Tooltip from "@/app/components/reader/Tooltip";

export default function NotificationsMenu() {
  return (
    <Popover.Root>
      <Tooltip label="Notifications" side="bottom" align="end">
        <Popover.Trigger asChild>
          <button
            aria-label="Notifications"
            className="cursor-pointer flex h-10 w-10 flex-none items-center justify-center rounded-sm border border-[var(--reader-border)] bg-[var(--reader-surface)] text-[var(--reader-text)] hover:bg-[var(--reader-surface-hover)]"
          >
            <Bell size={18} />
          </button>
        </Popover.Trigger>
      </Tooltip>

      <Popover.Portal>
        <Popover.Content
          align="end"
          alignOffset={-4}
          sideOffset={6}
          className="z-50 h-60 w-74 rounded-sm border border-[var(--reader-border)] bg-[var(--reader-surface)] shadow-lg p-4"
        >
          <p className="text-xs font-bold text-[var(--reader-text)]">Your Activities</p>
          <p className="mt-3 font-serif text-sm text-[var(--reader-text-muted)]">No notifications yet.</p>
          <Popover.Arrow
            width={16}
            height={8}
            className="drop-shadow-sm"
            style={{ fill: "var(--reader-surface)", stroke: "var(--reader-border)", strokeWidth: 1 }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
