import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_PATH = path.join(DATA_DIR, "library.json");
const TMP_PATH = `${DATA_PATH}.tmp`;

// Serializes writes within this server process (e.g. two tabs saving
// close together) on top of the atomic rename below, which protects
// against any single write being observed half-written.
let writeQueue: Promise<void> = Promise.resolve();

export async function GET() {
  try {
    const raw = await readFile(DATA_PATH, "utf-8");
    return new Response(raw, { headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(null, { status: 204 });
  }
}

export async function PUT(request: Request) {
  const body = await request.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  writeQueue = writeQueue.then(async () => {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(TMP_PATH, `${JSON.stringify(parsed, null, 2)}\n`, "utf-8");
    await rename(TMP_PATH, DATA_PATH);
  });
  await writeQueue;
  return new Response(null, { status: 204 });
}

export async function DELETE() {
  writeQueue = writeQueue.then(async () => {
    await rm(DATA_PATH, { force: true });
  });
  await writeQueue;
  return new Response(null, { status: 204 });
}
