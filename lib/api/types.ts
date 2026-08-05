// Mirrors api-spec.md's "Shared Types" section exactly — these are the
// camelCase JSON shapes every route handler below serializes to. Nothing
// snake_case ever reaches the client (api-spec.md's Conventions).

export type AnnotationRange = { passageId: string; start: number; end: number };

export type NoteContent =
  | { kind: "text"; text: string }
  | { kind: "voice"; audioUrl: string; durationMs: number };

export type MaterialSummary = {
  id: string;
  slug: string;
  materialType: string;
  title: string;
  author: string;
  description: string | null;
  cover: string | null;
  language: string | null;
  publishedYear: number | null;
  pageCountEstimate: number | null;
  categories: string[];
};

export type Note = {
  id: string;
  materialId: string;
  author: { readerId: string; pseudonym: string };
  ranges: AnnotationRange[];
  parentId: string | null;
  replyingToId: string | null;
  content: NoteContent;
  visibility: "public" | "private";
  reactionCount: number;
  reactedByMe: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NoteThread = { note: Note; replies: Note[] };

export type Highlight = {
  id: string;
  materialId: string;
  readerId: string;
  ranges: AnnotationRange[];
  createdAt: string;
  updatedAt: string;
};

export type CurrentReadingEntry = {
  materialId: string;
  sectionId: string;
  passageIndex: number;
  audioTimeMs: number | null;
  progressPercent: number;
  updatedAt: string;
};

export type ReaderProfile = {
  id: string;
  email: string;
  fullName: string;
  pseudonym: string;
  city: string | null;
  country: string | null;
  interests: string[];
  surveyReadMaterialIds: string[];
  onboardingStatus: "pending_survey" | "pending_welcome" | "active";
  currentReading: Record<string, CurrentReadingEntry>;
  joinedAt: string;
  updatedAt: string;
};
