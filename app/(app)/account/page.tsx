import type { Metadata } from "next";
import AccountView from "@/app/components/account/AccountView";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your pseudonym, profile details, and reading preferences.",
};

export default function AccountPage() {
  return <AccountView />;
}
