// GENERATED FILE — DO NOT EDIT.
// Source of truth: schema/book-document.schema.json
// Regenerate with: bun run schema:generate

import { z } from "zod";

const MarkSchema = z.object({
  start: z.number().int().gte(0),
  end: z.number().int().gte(0),
  kind: z.enum(["em", "strong", "underline", "strike", "code", "sub", "sup", "link", "note"]),
  noteId: z.string().optional(),
  href: z.string().optional(),
  internal: z.boolean().optional(),
  sectionId: z.string().optional(),
  fragmentId: z.string().optional(),
});

const TableCellSchema = z.object({
  text: z.string(),
  rowspan: z.number().int().gte(1).optional(),
  colspan: z.number().int().gte(1).optional(),
  align: z.enum(["left", "center", "right", "justify"]).optional(),
  marks: z.array(MarkSchema).optional(),
});

const TableSchema = z.object({
  caption: z.string().optional(),
  header: z.array(z.array(TableCellSchema)).optional(),
  rows: z.array(z.array(TableCellSchema)),
  footer: z.array(z.array(TableCellSchema)).optional(),
});

const DefinitionSchema = z.object({
  term: z.string(),
  definitions: z.array(z.string()),
});

const PassageSchema = z.object({
  id: z.string(),
  index: z.number().int().gte(0),
  type: z.enum(["paragraph", "heading", "blockquote", "image", "listItem", "code", "horizontalRule", "table", "definitionList"]),
  text: z.string(),
  level: z.number().int().gte(1).lte(6).optional(),
  marks: z.array(MarkSchema).optional(),
  src: z.string().optional(),
  caption: z.string().optional(),
  align: z.enum(["left", "center", "right", "justify"]).optional(),
  listLevel: z.number().int().gte(1).optional(),
  listStyle: z.enum(["ordered", "unordered"]).optional(),
  listStart: z.number().int().gte(1).optional(),
  language: z.string().optional(),
  table: TableSchema.optional(),
  definitions: z.array(DefinitionSchema).optional(),
});

const NarratorTrackSchema = z.object({
  narratorId: z.string(),
  src: z.string(),
  durationMs: z.number().int().gte(0),
});

const WordTimingSchema = z.object({
  passageId: z.string(),
  text: z.string(),
  startMs: z.number().int().gte(0),
  endMs: z.number().int().gte(0),
});

const SectionAudioSchema = z.object({
  narratorTracks: z.array(NarratorTrackSchema),
  words: z.array(WordTimingSchema).optional(),
});

// Section nests arbitrarily deep (children: Section[]) — z.lazy() is what
// makes that actually recursive at runtime, but on its own zod can't infer
// a type back out of that cycle, so this needs an explicit interface rather
// than `z.ZodType<any>`: the latter parses correctly but silently collapses
// every derived type (Section, Passage, Mark, ...) to `any` well outside
// this file, which is what disables noImplicitAny checking on any array of
// them anywhere in the app.
interface Section {
  id: string;
  title?: string;
  kind: "front" | "body" | "back" | "unknown";
  passages: z.infer<typeof PassageSchema>[];
  children: Section[];
  audio?: z.infer<typeof SectionAudioSchema>;
}

const SectionSchema: z.ZodType<Section> = z.lazy(() =>
  z.object({
    id: z.string(),
    title: z.string().optional(),
    kind: z.enum(["front", "body", "back", "unknown"]),
    passages: z.array(PassageSchema),
    children: z.array(SectionSchema),
    audio: SectionAudioSchema.optional(),
  })
);

const NarratorSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().optional(),
});

const BookMetadataSchema = z.object({
  title: z.string(),
  author: z.string(),
  description: z.string(),
  cover: z.string(),
  language: z.string(),
  publishedYear: z.number().int().optional(),
  pageCountEstimate: z.number().int().gte(0),
});

const NoteSchema = z.object({
  id: z.string(),
  sectionId: z.string(),
  marker: z.string(),
  text: z.string(),
});

export const BookDocumentSchema = z.object({
  schemaVersion: z.union([z.literal(3), z.literal(4)]),
  id: z.string(),
  slug: z.string(),
  metadata: BookMetadataSchema,
  narrators: z.array(NarratorSchema),
  sections: z.array(SectionSchema),
  spine: z.array(z.string()),
  notes: z.array(NoteSchema).default([]),
});

export type BookDocument = z.infer<typeof BookDocumentSchema>;
