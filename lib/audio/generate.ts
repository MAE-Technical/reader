import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { getBookDocument, writeBookDocument } from "@/lib/book/repository";
import { synthesizeChunk, type SynthesisResult } from "@/lib/audio/kokoro";
import { concatMp3 } from "@/lib/audio/mp3";
import { spokenPassageText } from "@/lib/audio/narrationText";
import { flattenSections } from "@/lib/search/bookIndex";
import type { Section, WordTiming } from "@/lib/book/schema";

const DEFAULT_NARRATOR_ID = "kokoro-default";
const DEFAULT_NARRATOR_NAME = process.env.KOKORO_NARRATOR_NAME ?? "Narrator";
// Lives beside the book's own JSON rather than in public/ — served by
// app/audio/[slug]/[section]/route.ts, not Next's static file handler.
const AUDIO_CONTENT_DIR = path.join(process.cwd(), "content", "books");
const DEFAULT_CONCURRENCY = Number(process.env.KOKORO_CONCURRENCY ?? 3);

type Chunk = { passageId: string; text: string };

/**
 * One chunk per spoken passage, not one call for the whole section — a
 * section's combined text can be long enough that Kokoro's own synthesis
 * time exceeds the request timeout. The section title (if any) rides along
 * with the first chunk rather than getting its own request. Passage-level
 * chunks also give each Kokoro response's word timestamps an unambiguous
 * passageId, which is what makes SectionAudio.words below meaningful.
 */
function sectionChunks(section: Section): Chunk[] {
  const chunks: Chunk[] = [];
  let prefix = section.title ?? "";
  for (const passage of section.passages) {
    if (passage.type === "image") continue;
    const text = spokenPassageText(passage);
    if (!text) continue;
    chunks.push({ passageId: passage.id, text: prefix ? `${prefix}\n\n${text}` : text });
    prefix = "";
  }
  return chunks;
}

type SectionJob = {
  sectionId: string;
  chunks: Chunk[];
  results: (SynthesisResult | undefined)[];
  remaining: number;
  failedError?: string;
};

export type GenerateBookAudioOptions = {
  /** How many passage-level Kokoro calls to run at once. Defaults to KOKORO_CONCURRENCY or 3. */
  concurrency?: number;
  /** Re-synthesize sections that already have a narrator track, instead of skipping them. */
  force?: boolean;
  /** Fires after each passage-level Kokoro call settles. */
  onChunkDone?: (
    info: { sectionId: string; passageId: string; chunkIndex: number; totalChunks: number },
    result: { ok: true } | { ok: false; error: string }
  ) => void;
  onSectionDone?: (sectionId: string, result: { ok: true } | { ok: false; error: string }) => void;
};

export type GenerateResult = { ok: true } | { ok: false; error: string };

/**
 * Synthesizes narration for every section in a book's spine, skipping
 * sections that already have a narrator track (so a killed/interrupted run
 * is safe to just re-run — already-done work is never redone). Each
 * section's passages are queued as individual chunks and run through a
 * shared pool of up to `concurrency` Kokoro requests; once every chunk for a
 * section has settled, its audio is concatenated into one mp3 and the
 * section is written to disk and persisted to the book JSON immediately —
 * a section is all-or-nothing, but never held in memory past its own
 * completion waiting on the rest of the book.
 */
export async function generateBookAudio(slug: string, options: GenerateBookAudioOptions = {}): Promise<GenerateResult> {
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);

  try {
    const book = await getBookDocument(slug);
    const sectionsById = new Map(flattenSections(book.sections).map((s) => [s.id, s]));

    const jobs: SectionJob[] = book.spine
      .map((id) => sectionsById.get(id))
      .filter((section): section is Section => {
        if (!section) return false;
        if (!options.force && section.audio?.narratorTracks.length) return false;
        return true;
      })
      .map((section) => {
        const chunks = sectionChunks(section);
        return { sectionId: section.id, chunks, results: new Array(chunks.length), remaining: chunks.length };
      })
      .filter((job) => job.chunks.length > 0);

    if (!book.narrators.some((n) => n.id === DEFAULT_NARRATOR_ID)) {
      book.narrators = [...book.narrators, { id: DEFAULT_NARRATOR_ID, name: DEFAULT_NARRATOR_NAME }];
    }

    // Persists happen off the same in-memory `book` object and are chained
    // so concurrent workers finishing at once can't clobber each other's write.
    let writeChain = Promise.resolve();
    const persist = () => {
      writeChain = writeChain.then(() => writeBookDocument(slug, book));
      return writeChain;
    };

    async function finalizeJob(job: SectionJob) {
      if (job.failedError) {
        options.onSectionDone?.(job.sectionId, { ok: false, error: job.failedError });
        return;
      }
      const results = job.results as SynthesisResult[];
      const audio = concatMp3(results.map((r) => r.audio));

      let cumulativeMs = 0;
      const words: WordTiming[] = [];
      for (let i = 0; i < job.chunks.length; i++) {
        const { passageId } = job.chunks[i];
        const result = results[i];
        for (const w of result.words) {
          words.push({ passageId, text: w.word, startMs: cumulativeMs + w.startMs, endMs: cumulativeMs + w.endMs });
        }
        cumulativeMs += result.durationMs;
      }

      const destPath = path.join(AUDIO_CONTENT_DIR, slug, "audiobooks", `${job.sectionId}.mp3`);
      await mkdir(path.dirname(destPath), { recursive: true });
      await writeFile(destPath, audio);

      const section = sectionsById.get(job.sectionId)!;
      section.audio = {
        narratorTracks: [
          { narratorId: DEFAULT_NARRATOR_ID, src: `/audio/${slug}/${job.sectionId}.mp3`, durationMs: cumulativeMs },
        ],
        words,
      };
      await persist();
      options.onSectionDone?.(job.sectionId, { ok: true });
    }

    const tasks = jobs.flatMap((job) => job.chunks.map((chunk, chunkIndex) => ({ job, chunk, chunkIndex })));
    let cursor = 0;
    async function worker() {
      while (cursor < tasks.length) {
        const { job, chunk, chunkIndex } = tasks[cursor++];
        const chunkInfo = { sectionId: job.sectionId, passageId: chunk.passageId, chunkIndex, totalChunks: job.chunks.length };
        try {
          job.results[chunkIndex] = await synthesizeChunk(chunk.text);
          options.onChunkDone?.(chunkInfo, { ok: true });
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          job.failedError ??= error;
          options.onChunkDone?.(chunkInfo, { ok: false, error });
        }
        if (--job.remaining === 0) await finalizeJob(job);
      }
    }

    await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
