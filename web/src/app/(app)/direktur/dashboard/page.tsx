import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DirekturDashboardPage } from "@/components/pages/direktur-dashboard-page";

export default async function Page() {
  const session = await auth();
  if (session?.user.role !== "DIREKTUR" && session?.user.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return <DirekturDashboardPage />;
}
