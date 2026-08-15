import { getLoginSettings } from "@/lib/login-settings";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const settings = await getLoginSettings();
  return <LoginForm settings={settings} />;
}
