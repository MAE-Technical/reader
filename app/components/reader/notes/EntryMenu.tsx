"use client";

import { PenLine, Share, SquarePen, Trash2 } from "lucide-react";
import OverflowMenu from "./OverflowMenu";

/** A note/reply's Share/Edit/Delete, tucked behind its ellipsis trigger.
 * Delete requires `isOwn` — once real multi-author threads exist, this is
 * what already stops a reader deleting someone else's entry. Edit requires
 * both `isOwn` *and* the entry being text (voice entries were never
 * editable in place, unrelated to authorship). Share has no feature behind
 * it yet (no sharing exists in this codebase) — shown per product
 * decision, disabled rather than wired to a stub. */
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
