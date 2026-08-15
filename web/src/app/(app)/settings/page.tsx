import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SettingsView } from "./settings-view";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <SettingsView />;
}
