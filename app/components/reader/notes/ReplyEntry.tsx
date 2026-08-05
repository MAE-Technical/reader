"use client";

import { EllipsisVertical } from "lucide-react";
import type { Note } from "@/lib/api/types";
import { useIsOwnNote } from "@/lib/reader/currentAuthor";
import { comradeName } from "@/lib/reader/authorDisplay";
import AuthorRow from "./AuthorRow";
import NoteContent from "./NoteContent";
import ReactionButton from "./ReactionButton";
import NoteComposer from "./NoteComposer";
import EntryMenu from "./EntryMenu";
import type { ThreadActions, ThreadUIState } from "@/lib/reader/threadTypes";

/** One reply, at the flat second tier under its top-level note — same
 * author/content/action shape as NoteThreadCard, just smaller, plus the
 * "replying to Comrade X" chip when it addresses another reply rather than
 * the top-level note itself (see NoteEntry.replyingToId).
 *
 * Its own "Reply" trigger doesn't mount a composer here — NoteThreadCard
 * owns the one shared composer instance for the whole thread; this button
 * only retargets it (`ui.toggleComposer`), marked with
 * `data-note-reply-trigger` so that composer's outside-click handling
 * never mistakes clicking it for dismissal. */
export default function ReplyEntry({
  reply,
  replyingToName,
  ui,
  actions,
}: {
  reply: Note;
  replyingToName?: string;
  ui: ThreadUIState;
  actions: ThreadActions;
}) {
  const own = useIsOwnNote(reply);
  const isEditing = ui.editingId === reply.id;
  const isTargeted = ui.activeComposerFor === reply.id;
  const isMenuOpen = ui.activeMenuFor === reply.id;

  return (
    <div className="flex flex-col gap-1.5">
      <AuthorRow
        name={reply.author.pseudonym}
        savedAt={Date.parse(reply.updatedAt)}
        size="small"
        menu={
          <div className="relative ml-auto flex-none">
            <button
              onClick={() => ui.toggleMenu(isMenuOpen ? null : reply.id)}
              className="flex items-center bg-transparent border-none cursor-pointer text-[var(--reader-text-muted)] p-0.5"
            >
              <EllipsisVertical size={14} />
            </button>
            {isMenuOpen && (
              <EntryMenu
                isOwn={own}
                isTextEntry={reply.content.kind === "text"}
                onEdit={() => {
                  ui.startEdit(reply.id);
                  ui.toggleMenu(null);
                }}
                onDelete={() => {
                  actions.delete(reply.id);
                  ui.toggleMenu(null);
                }}
                onClose={() => ui.toggleMenu(null)}
              />
            )}
          </div>
        }
      />
      {replyingToName && (
        <div className="w-fit font-serif italic text-[12px] text-[var(--reader-text-muted)]">
          — in reply to {comradeName(replyingToName)}
        </div>
      )}
      {isEditing ? (
        <NoteComposer
          initialText={reply.content.kind === "text" ? reply.content.text : ""}
          startCollapsed={false}
          onCancel={() => ui.startEdit(null)}
          onSave={(content) => {
            actions.saveEdit(reply.id, content);
            ui.startEdit(null);
          }}
        />
      ) : (
        <NoteContent content={reply.content} />
      )}
      <div className="flex items-center gap-3.5">
        <ReactionButton
          count={reply.reactionCount}
          reacted={reply.reactedByMe}
          onToggle={() => actions.toggleReaction(reply.id)}
          size="small"
        />
        <button
          data-note-reply-trigger
          onClick={() => ui.toggleComposer(reply.id)}
          className={`border-[var(--reader-border)] bg-[var(--reader-surface)] cursor-pointer text-xs font-semibold p-0 ${
            isTargeted ? "text-[var(--reader-text)]" : "text-[var(--reader-text-muted)]"
          }`}
        >
          Reply
        </button>
      </div>
    </div>
  );
}
