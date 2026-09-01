"use client";

import { SquarePen, Trash2 } from "lucide-react";
import OverflowMenu from "./OverflowMenu";

/** A note/reply's Edit/Delete, tucked behind its ellipsis trigger. Callers
 * only mount this (and its trigger) for the reader's own entries — see
 * NoteThreadCard/ReplyEntry, which render the whole menu slot as `own ?
 * ... : undefined` — since neither action applies to someone else's note,
 * there'd otherwise be nothing to show and the trigger would open an empty
 * box. `isOwn` still gates here too, as a second line of defense against a
 * caller regression rather than the one place this is enforced. Edit
 * additionally requires the entry being text (voice entries were never
 * editable in place, unrelated to authorship). No Share yet — no sharing
 * feature exists in this codebase; add it here once one does, rather than
 * showing a permanently-disabled placeholder. */
export default function EntryMenu({
  isOwn,
  isTextEntry,
  onEdit,
  onDelete,
  onClose,
}: {
  isOwn: boolean;
  isTextEntry: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <OverflowMenu
      onClose={onClose}
      items={[
        ...(isOwn && isTextEntry ? [{ label: "Edit", onClick: onEdit, icon: <SquarePen size={13} /> }] : []),
        ...(isOwn ? [{ label: "Delete", onClick: onDelete, danger: true, icon: <Trash2 size={13} /> }] : []),
      ]}
    />
  );
}
