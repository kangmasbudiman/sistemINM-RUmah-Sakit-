import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Header } from "@/components/layouts/header";
import { Sidebar } from "@/components/layouts/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar user={session.user} />

      <div className="w-full bg-gray-2 dark:bg-[#020d1a]">
        <Header user={session.user} />

        <main className="isolate mx-auto w-full max-w-(--breakpoint-2xl) overflow-hidden p-4 md:p-6 2xl:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
