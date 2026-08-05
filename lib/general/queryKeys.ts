// Shared TanStack Query keys for /api/general — small, cross-cutting
// endpoints that don't belong to one specific resource group.
export const generalKeys = {
  randomBooks: (count: number) => ["general", "random-books", count] as const,
};
