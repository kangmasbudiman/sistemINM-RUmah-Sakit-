import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ALL_UNITS_ROLES, canApprove, canValidate } from "@/lib/auth-helpers";
import { CATEGORY_LABEL } from "@/lib/utils";
import type { IndicatorCategory } from "@prisma/client";
import { AnalisaListClient, type AnalisaRow } from "@/app/(app)/analisa/analisa-list-client";

export async function AnalisaPage({
  category,
  basePath,
  inputBasePath,
  searchParams,
}: {
  category: IndicatorCategory;
  basePath: string;
  inputBasePath: string;
  searchParams: Promise<{
    year?: string;
    month?: string;
    status?: string;
    unit?: string;
  }>;
}) {
  const session = await auth();
  const user = session!.user;
  const isAllUnits = (ALL_UNITS_ROLES as readonly string[]).includes(user.role);
  const sp = await searchParams;

  const now = new Date();
  const year = sp.year ? Number(sp.year) : now.getFullYear();
  const month = sp.month ? Number(sp.month) : now.getMonth() + 1;
  const statusFilter = sp.status as
    | "DRAFT"
    | "SUBMITTED"
    | "VALIDATED"
    | "APPROVED"
    | "REJECTED"
    | undefined;

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
    indicator: { category },
  };
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
        category,
        ...(unitFilterId ? { unitId: unitFilterId } : {}),
      },
      include: { unit: true },
      orderBy: [
        { unit: { orderNo: "asc" } },
        { orderNo: "asc" },
      ],
    }),
  ]);

  const indicatorIds = analyses.map((a) => a.indicatorId);
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

  const rows: AnalisaRow[] = analyses.map((a) => {
    const obs = obsByIndicator.get(a.indicatorId) ?? { n: 0, d: 0 };
    const pct = obs.d > 0 ? (obs.n / obs.d) * 100 : 0;
    const target = Number(a.indicator.targetPct);
    const isInverse = target === 0;
    const achieved = isInverse
      ? obs.d === 0 || pct <= 0
      : obs.d > 0 && pct >= target;
    return {
      id: a.id,
      indicatorId: a.indicatorId,
      indicatorCode: a.indicator.code,
      indicatorTitle: a.indicator.title,
      unitCode: a.indicator.unit.code,
      unitName: a.indicator.unit.name,
      numerator: obs.n,
      denominator: obs.d,
      pct,
      target,
      isInverse,
      achieved,
      status: a.status,
      submittedAt: a.submittedAt?.toISOString() ?? null,
      validatedAt: a.validatedAt?.toISOString() ?? null,
      validatedByName: a.validatedBy?.name ?? null,
      validationNote: a.validationNote ?? "",
      approvedAt: a.approvedAt?.toISOString() ?? null,
      approvedByName: a.approvedBy?.name ?? null,
      rejectionNote: a.rejectionNote ?? "",
      dataCollector: a.dataCollector ?? "",
      picName: a.picName ?? "",
      analisaText: a.analisaText ?? "",
      pdsaPlan: a.pdsaPlan ?? "",
      pdsaDo: a.pdsaDo ?? "",
      pdsaStudy: a.pdsaStudy ?? "",
      pdsaAct: a.pdsaAct ?? "",
    };
  });

  const emptyIndicators = indicators
    .filter((i) => !analyses.some((a) => a.indicatorId === i.id))
    .map((i) => ({
      id: i.id,
      code: i.code,
      title: i.title,
      unitCode: i.unit.code,
      unitName: i.unit.name,
    }));

  return (
    <AnalisaListClient
      rows={rows}
      emptyIndicators={emptyIndicators}
      units={units.map((u) => ({ code: u.code, name: u.name }))}
      year={year}
      month={month}
      statusFilter={statusFilter}
      selectedUnitCode={sp.unit}
      isAllUnits={isAllUnits}
      canApprove={canApprove(user)}
      canValidate={canValidate(user)}
      currentRole={user.role}
      basePath={basePath}
      inputBasePath={inputBasePath}
      categoryLabel={CATEGORY_LABEL[category]}
    />
  );
}
