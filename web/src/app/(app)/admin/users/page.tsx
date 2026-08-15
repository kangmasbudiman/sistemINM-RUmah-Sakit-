import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UsersManager } from "./users-manager";

export default async function UsersAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [users, units] = await Promise.all([
    prisma.user.findMany({
      include: { unit: true },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.unit.findMany({ orderBy: { orderNo: "asc" } }),
  ]);

  const safeUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    nik: u.nik ?? "",
    gelar: u.gelar ?? "",
    unitId: u.unitId ?? "",
    unitCode: u.unit?.code ?? null,
    unitName: u.unit?.name ?? null,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  }));

  const safeUnits = units.map((u) => ({
    id: u.id,
    code: u.code,
    name: u.name,
    orderNo: u.orderNo,
  }));

  return <UsersManager users={safeUsers} units={safeUnits} currentUserId={session.user.id} />;
}
