import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRestrictEditWindow } from "@/lib/app-settings";
import { MasterManager } from "./master-manager";

export default async function MasterAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [units, indicators, restrictEditWindow] = await Promise.all([
    prisma.unit.findMany({
      orderBy: { orderNo: "asc" },
      include: { _count: { select: { indicators: true, users: true } } },
    }),
    prisma.indicator.findMany({
      orderBy: [{ unit: { orderNo: "asc" } }, { orderNo: "asc" }],
      include: {
        unit: true,
        _count: { select: { observations: true, analyses: true } },
      },
    }),
    getRestrictEditWindow(),
  ]);

  const safeUnits = units.map((u) => ({
    id: u.id,
    code: u.code,
    name: u.name,
    description: u.description ?? "",
    orderNo: u.orderNo,
    indicatorCount: u._count.indicators,
    userCount: u._count.users,
  }));

  const safeIndicators = indicators.map((i) => ({
    id: i.id,
    unitId: i.unitId,
    unitCode: i.unit.code,
    unitName: i.unit.name,
    category: i.category,
    code: i.code,
    title: i.title,
    numeratorLabel: i.numeratorLabel,
    denominatorLabel: i.denominatorLabel,
    targetPct: Number(i.targetPct),
    orderNo: i.orderNo,
    isActive: i.isActive,
    observationCount: i._count.observations,
    analysisCount: i._count.analyses,
  }));

  return (
    <MasterManager
      units={safeUnits}
      indicators={safeIndicators}
      restrictEditWindow={restrictEditWindow}
    />
  );
}
