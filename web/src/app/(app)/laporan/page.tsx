import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ALL_UNITS_ROLES } from "@/lib/auth-helpers";
import { LaporanClient, type LaporanRow } from "./laporan-client";

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string;
    month?: string;
    category?: string;
    unit?: string;
    status?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // KOMITE_MUTU, ADMIN, DIREKTUR, VALIDATOR boleh akses
  const allowed = ["ADMIN", "KOMITE_MUTU", "DIREKTUR", "VALIDATOR", "PIC_UNIT"];
  if (!allowed.includes(session.user.role)) redirect("/dashboard");

  const user = session.user;
  const isAllUnits = (ALL_UNITS_ROLES as readonly string[]).includes(user.role);
  const sp = await searchParams;

  const now = new Date();
  const year = sp.year ? Number(sp.year) : now.getFullYear();
  const month = sp.month ? Number(sp.month) : now.getMonth() + 1;
  const category = (sp.category as "INM" | "IMP" | "IMP_RS" | "IMK" | "ALL") ?? "ALL";
  const statusFilter = (sp.status as string) ?? "";

  const units = await prisma.unit.findMany({ orderBy: { orderNo: "asc" } });

  let unitFilterId: string | undefined;
  if (isAllUnits && sp.unit) {
    unitFilterId = units.find((u) => u.code === sp.unit)?.id;
  } else if (!isAllUnits) {
    unitFilterId = user.unitId ?? undefined;
  }

  const where: Record<string, unknown> = {
    periodYear: year,
    periodMonth: month,
  };
  if (category !== "ALL") where.indicator = { category };
  if (unitFilterId) where.unitId = unitFilterId;
  if (statusFilter) where.status = statusFilter;

  const [analyses, indicators] = await Promise.all([
    prisma.analysis.findMany({
      where,
      include: {
        indicator: { include: { unit: true } },
        approvedBy: { select: { name: true } },
        validatedBy: { select: { name: true } },
      },
      orderBy: [
        { indicator: { unit: { orderNo: "asc" } } },
        { indicator: { orderNo: "asc" } },
      ],
    }),
    prisma.indicator.findMany({
      where: {
        ...(category !== "ALL" ? { category } : {}),
        ...(unitFilterId ? { unitId: unitFilterId } : {}),
        isActive: true,
      },
      include: { unit: true },
      orderBy: [
        { unit: { orderNo: "asc" } },
        { orderNo: "asc" },
      ],
    }),
  ]);

  // Aggregate observations per indicator for the period
  const indicatorIds = [
    ...new Set([
      ...analyses.map((a) => a.indicatorId),
      ...indicators.map((i) => i.id),
    ]),
  ];
  const observations = indicatorIds.length
    ? await prisma.observation.findMany({
        where: {
          indicatorId: { in: indicatorIds },
          observationDate: {
            gte: new Date(Date.UTC(year, month - 1, 1)),
            lt: new Date(Date.UTC(year, month, 1)),
          },
        },
        select: {
          indicatorId: true,
          numeratorValue: true,
          denominatorValue: true,
        },
      })
    : [];

  const obsByIndicator = new Map<string, { n: number; d: number }>();
  for (const o of observations) {
    const cur = obsByIndicator.get(o.indicatorId) ?? { n: 0, d: 0 };
    cur.n += o.numeratorValue;
    cur.d += o.denominatorValue;
    obsByIndicator.set(o.indicatorId, cur);
  }

  // Build rows: one per indicator (with or without analysis)
  const analysisByIndicator = new Map(analyses.map((a) => [a.indicatorId, a]));
  const rows: LaporanRow[] = indicatorIds.map((indId) => {
    const ind = indicators.find((i) => i.id === indId)
      ?? analyses.find((a) => a.indicatorId === indId)!.indicator;
    const obs = obsByIndicator.get(indId) ?? { n: 0, d: 0 };
    const a = analysisByIndicator.get(indId);
    const pct = obs.d > 0 ? (obs.n / obs.d) * 100 : 0;
    const target = Number(ind.targetPct);
    const isInverse = target === 0;
    const achieved = isInverse
      ? obs.d === 0 || obs.n === 0
      : obs.d > 0 && pct >= target;
    return {
      id: a?.id ?? ind.id,
      indicatorId: ind.id,
      indicatorCode: ind.code,
      indicatorTitle: ind.title,
      category: ind.category,
      unitCode: ind.unit.code,
      unitName: ind.unit.name,
      numerator: obs.n,
      denominator: obs.d,
      pct: Number(pct.toFixed(2)),
      target,
      isInverse,
      achieved,
      status: a?.status ?? "DRAFT",
      validatedByName: a?.validatedBy?.name ?? null,
      validatedAt: a?.validatedAt?.toISOString() ?? null,
      approvedByName: a?.approvedBy?.name ?? null,
      approvedAt: a?.approvedAt?.toISOString() ?? null,
      hasAnalysis: !!a,
      analisaText: a?.analisaText ?? "",
      pdsaPlan: a?.pdsaPlan ?? "",
      pdsaDo: a?.pdsaDo ?? "",
      pdsaStudy: a?.pdsaStudy ?? "",
      pdsaAct: a?.pdsaAct ?? "",
    };
  });

  return (
    <LaporanClient
      rows={rows}
      units={units.map((u) => ({ code: u.code, name: u.name }))}
      year={year}
      month={month}
      category={category}
      statusFilter={statusFilter}
      selectedUnitCode={sp.unit}
      isAllUnits={isAllUnits}
      hospitalName="RS Royal Prima Jambi"
      generatedBy={user.name ?? user.email ?? "—"}
      currentRole={user.role}
      unitName={user.unitName ?? null}
    />
  );
}
