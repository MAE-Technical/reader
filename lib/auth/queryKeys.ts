// Shared TanStack Query keys for everything under /api/auth/me — one place
// so a mutation that writes the profile (survey, complete-onboarding,
// PATCH /me) and a query that reads it (useProfile) never drift onto
// slightly different key arrays.
export const authKeys = {
  me: ["auth", "me"] as const,
  continueReading: ["auth", "continue-reading"] as const,
};
