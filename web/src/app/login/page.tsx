import type { Metadata } from "next";
import { getLoginSettings } from "@/lib/login-settings";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getLoginSettings();
  return {
    title: s.brandTitle,
    description: s.brandSubtitle || undefined,
  };
}

export default async function LoginPage() {
  const settings = await getLoginSettings();
  return <LoginForm settings={settings} />;
}
