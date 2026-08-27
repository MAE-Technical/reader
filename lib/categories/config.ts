import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

const CONFIG_PATH = path.join(process.cwd(), "config", "categories.json");

type RawCategoriesConfig = { categories: string[] };

let cached: RawCategoriesConfig | undefined;

async function loadRawConfig(): Promise<RawCategoriesConfig> {
  if (!cached) {
    cached = JSON.parse(await readFile(CONFIG_PATH, "utf-8")) as RawCategoriesConfig;
  }
  return cached;
}

export async function getCategories(): Promise<string[]> {
  const categories = (await loadRawConfig()).categories;
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const category of categories) {
    const trimmed = category.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    unique.push(trimmed);
  }

  return unique;
}
