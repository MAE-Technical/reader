#!/usr/bin/env bun
// Batch narration generation, outside the admin UI's request lifecycle so a
// long run can't be cut off by an HTTP timeout.
//
// Usage:
//   bun run audio:generate --book <slug>       narrate one book
//   bun run audio:generate --book all           narrate every book in content/books
//   bun run audio:generate --book <slug> --force        redo sections that already have audio
//   bun run audio:generate --book <slug> --concurrency 5
//
// Already-narrated sections are skipped by default, so re-running after a
// crash/interrupt just picks up where it left off.
import { listBooks } from "@/lib/book/repository";
import { generateBookAudio } from "@/lib/audio/generate";

function parseArgs(argv: string[]) {
  const args: { book?: string; concurrency?: number; force: boolean } = { force: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--book") args.book = argv[++i];
    else if (argv[i] === "--concurrency") args.concurrency = Number(argv[++i]);
    else if (argv[i] === "--force") args.force = true;
  }
  return args;
}

async function main() {
  const { book, concurrency, force } = parseArgs(process.argv.slice(2));
  if (!book) {
    console.error("Usage: bun run audio:generate --book <slug|all> [--concurrency N] [--force]");
    process.exit(1);
  }

  const slugs = book === "all" ? (await listBooks()).map((b) => b.slug) : [book];

  for (const slug of slugs) {
    console.log(`\n${slug}`);
    let done = 0;
    let failed = 0;
    const result = await generateBookAudio(slug, {
      concurrency,
      force,
      onChunkDone: ({ sectionId, chunkIndex, totalChunks }, r) => {
        const progress = `${chunkIndex + 1}/${totalChunks}`;
        if (r.ok) {
          console.log(`    ${sectionId} passage ${progress} ✓`);
        } else {
          console.error(`    ${sectionId} passage ${progress} ✗ ${r.error}`);
        }
      },
      onSectionDone: (sectionId, r) => {
        if (r.ok) {
          done++;
          console.log(`  ✓ ${sectionId}`);
        } else {
          failed++;
          console.error(`  ✗ ${sectionId}: ${r.error}`);
        }
      },
    });

    if (!result.ok) {
      console.error(`  book failed: ${result.error}`);
      continue;
    }
    console.log(`  ${done} generated, ${failed} failed${failed === 0 && done === 0 ? " (nothing to do)" : ""}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
