// Shared TanStack Query keys for a material's own highlights/notes — one
// place so a mutation (create/delete highlight, create/edit/delete note)
// and the query it should invalidate never drift onto slightly different
// key arrays.
export const materialKeys = {
  highlights: (materialId: string) => ["materials", materialId, "highlights"] as const,
  notes: (materialId: string) => ["materials", materialId, "notes"] as const,
};
