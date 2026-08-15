import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLoginSettings } from "@/lib/login-settings";
import { LoginSettingsForm } from "./login-settings-form";

export default async function LoginSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const settings = await getLoginSettings();

  return <LoginSettingsForm initial={settings} />;
}
