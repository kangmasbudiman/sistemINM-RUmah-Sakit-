import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminDashboardPage } from "@/components/pages/admin-dashboard-page";

export default async function Page() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/dashboard");
  return <AdminDashboardPage />;
}
