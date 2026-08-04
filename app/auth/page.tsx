import { redirect } from "next/navigation";

/**
 * The dedicated landing page that used to live here moved onto the home
 * feed (HomeAuthBanner) and the desktop sidebar's Log in / Join the
 * movement rows — a reader only ever hit this route directly, so it's kept
 * as a redirect rather than deleted outright, in case anything still links
 * or bookmarks bare /auth.
 */
export default function AuthIndexPage() {
  redirect("/auth/login");
}
