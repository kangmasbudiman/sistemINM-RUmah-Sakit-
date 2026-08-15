import { prisma } from "@/lib/prisma";
import type { IndicatorCategory } from "@prisma/client";

export type MonthlyTrendPoint = {
  year: number;
  month: number; // 1-12
  label: string; // "Jan", "Feb", ...
  numerator: number;
  denominator: number;
  pct: number;
  achievedCount: number;
  totalCount: number;
};

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

/**
 * Hitung trend bulanan untuk N bulan terakhir (default 6).
 * Scope: optional filter by unitId, category.
 */
export async function computeMonthlyTrend(opts: {
  months?: number;
  unitId?: string;
  category?: IndicatorCategory;
  indicatorId?: string;
  endYear?: number;
  endMonth?: number; // 1-12
}): Promise<MonthlyTrendPoint[]> {
  const months = opts.months ?? 6;
  const end = new Date();
  const endYear = opts.endYear ?? end.getFullYear();
  const endMonth = opts.endMonth ?? end.getMonth() + 1;

  // Build list of (year, month) descending from end
  const periods: { year: number; month: number }[] = [];
  let y = endYear;
  let m = endMonth;
  for (let i = 0; i < months; i++) {
    periods.push({ year: y, month: m });
    m--;
    if (m < 1) {
      m = 12;
      y--;
    }
  }
  periods.reverse();

  // Get all indicators in scope (active only)
  const indicatorWhere: {
    isActive: boolean;
    unitId?: string;
    category?: IndicatorCategory;
    id?: string;
  } = { isActive: true };
  if (opts.unitId) indicatorWhere.unitId = opts.unitId;
  if (opts.category) indicatorWhere.category = opts.category;
  if (opts.indicatorId) indicatorWhere.id = opts.indicatorId;

  const indicators = await prisma.indicator.findMany({
    where: indicatorWhere,
    select: { id: true, targetPct: true },
  });
  const indicatorMap = new Map(
    indicators.map((i) => [i.id, Number(i.targetPct)])
  );

  // Determine date range
  const firstPeriod = periods[0];
  const lastPeriod = periods[periods.length - 1];
  const gte = new Date(Date.UTC(firstPeriod.year, firstPeriod.month - 1, 1));
  const lt = new Date(Date.UTC(lastPeriod.year, lastPeriod.month, 1));

  // Aggregate observations per indicator per month
  const observations = await prisma.observation.findMany({
    where: {
      observationDate: { gte, lt },
      indicatorId: { in: [...indicatorMap.keys()] },
    },
    select: {
      indicatorId: true,
      observationDate: true,
      numeratorValue: true,
      denominatorValue: true,
    },
  });

  // Group by (year, month, indicatorId)
  const byPeriodIndicator = new Map<
    string,
    { n: number; d: number }
  >();
  for (const o of observations) {
    const d = new Date(o.observationDate);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${o.indicatorId}`;
    const cur = byPeriodIndicator.get(key) ?? { n: 0, d: 0 };
    cur.n += o.numeratorValue;
    cur.d += o.denominatorValue;
    byPeriodIndicator.set(key, cur);
  }

  // Build per-period summary
  return periods.map(({ year, month }) => {
    let sumN = 0;
    let sumD = 0;
    let achieved = 0;
    let total = 0;
    for (const [indId, target] of indicatorMap) {
      const key = `${year}-${month}-${indId}`;
      const o = byPeriodIndicator.get(key);
      total++;
      if (o) {
        sumN += o.n;
        sumD += o.d;
        const pct = o.d > 0 ? (o.n / o.d) * 100 : 0;
        const isInverse = target === 0;
        if (isInverse ? o.n === 0 : o.d > 0 && pct >= target) {
          achieved++;
        }
      }
    }
    const pct = sumD > 0 ? Number(((sumN / sumD) * 100).toFixed(2)) : 0;
    return {
      year,
      month,
      label: `${MONTH_LABELS[month - 1]} ${String(year).slice(-2)}`,
      numerator: sumN,
      denominator: sumD,
      pct,
      achievedCount: achieved,
      totalCount: total,
    };
  });
}

export type UnitComparisonRow = {
  unitCode: string;
  unitName: string;
  numerator: number;
  denominator: number;
  pct: number;
  achievedCount: number;
  totalCount: number;
};

/**
 * Hitung pencapaian per unit untuk periode tertentu (default bulan ini).
 */
export async function computeUnitComparison(opts: {
  year?: number;
  month?: number;
  category?: IndicatorCategory;
}): Promise<UnitComparisonRow[]> {
  const now = new Date();
  const year = opts.year ?? now.getFullYear();
  const month = opts.month ?? now.getMonth() + 1;

  const units = await prisma.unit.findMany({
    orderBy: { orderNo: "asc" },
    include: {
      indicators: {
        where: {
          isActive: true,
          ...(opts.category ? { category: opts.category } : {}),
        },
        select: { id: true, targetPct: true },
      },
    },
  });

  const indicatorToUnit = new Map<string, { unitCode: string; unitName: string; target: number }>();
  for (const u of units) {
    for (const i of u.indicators) {
      indicatorToUnit.set(i.id, {
        unitCode: u.code,
        unitName: u.name,
        target: Number(i.targetPct),
      });
    }
  }

  const observations = await prisma.observation.findMany({
    where: {
      observationDate: {
        gte: new Date(Date.UTC(year, month - 1, 1)),
        lt: new Date(Date.UTC(year, month, 1)),
      },
      indicatorId: { in: [...indicatorToUnit.keys()] },
    },
    select: {
      indicatorId: true,
      numeratorValue: true,
      denominatorValue: true,
    },
  });

  // Group by unit (via indicator)
  const byUnit = new Map<
    string,
    {
      unitCode: string;
      unitName: string;
      n: number;
      d: number;
      achieved: number;
      total: number;
      targets: Map<string, number>; // indicatorId → target
    }
  >();

  for (const u of units) {
    byUnit.set(u.code, {
      unitCode: u.code,
      unitName: u.name,
      n: 0,
      d: 0,
      achieved: 0,
      total: u.indicators.length,
      targets: new Map(u.indicators.map((i) => [i.id, Number(i.targetPct)])),
    });
  }

  // Aggregate observations per indicator first
  const obsByIndicator = new Map<string, { n: number; d: number }>();
  for (const o of observations) {
    const cur = obsByIndicator.get(o.indicatorId) ?? { n: 0, d: 0 };
    cur.n += o.numeratorValue;
    cur.d += o.denominatorValue;
    obsByIndicator.set(o.indicatorId, cur);
  }

  // For each indicator, compute achievement & sum into unit
  for (const [indId, obs] of obsByIndicator) {
    const meta = indicatorToUnit.get(indId);
    if (!meta) continue;
    const unit = byUnit.get(meta.unitCode);
    if (!unit) continue;
    unit.n += obs.n;
    unit.d += obs.d;
    const target = meta.target;
    const isInverse = target === 0;
    const pct = obs.d > 0 ? (obs.n / obs.d) * 100 : 0;
    if (isInverse ? obs.n === 0 : obs.d > 0 && pct >= target) {
      unit.achieved++;
    }
  }

  return Array.from(byUnit.values())
    .filter((u) => u.total > 0)
    .map((u) => ({
      unitCode: u.unitCode,
      unitName: u.unitName,
      numerator: u.n,
      denominator: u.d,
      pct: u.d > 0 ? Number(((u.n / u.d) * 100).toFixed(2)) : 0,
      achievedCount: u.achieved,
      totalCount: u.total,
    }));
}
