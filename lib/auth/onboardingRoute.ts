import type { ReaderProfile } from "@/lib/api/types";

/** Where signup/login route a reader immediately after — mirrors
 * `onboardingStatus`'s own linear progression (api-spec.md § Shared Types).
 * Shared by both flows since login can just as easily land a reader
 * mid-onboarding (they signed up, then closed the tab before finishing the
 * survey) as signup always does. */
export function onboardingRoute(reader: ReaderProfile): string {
  switch (reader.onboardingStatus) {
    case "pending_survey":
      return "/auth/survey";
    case "pending_welcome":
      return "/auth/welcome";
    case "active":
      return "/home";
  }
}
