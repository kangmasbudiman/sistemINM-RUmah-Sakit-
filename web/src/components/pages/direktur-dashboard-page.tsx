import { prisma } from "@/lib/prisma";
import type { IndicatorCategory } from "@prisma/client";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Hospital,
  ListChecks,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { monthLabel, CATEGORY_LABEL, indicatorDetailPath } from "@/lib/utils";
import {
  computeMonthlyTrend,
  computeUnitComparison,
} from "@/lib/monthly-trend";
import {
  MonthlyAchievedChart,
  MonthlyTrendChart,
  UnitComparisonChart,
} from "@/components/charts/trend-charts";

function currentPeriod() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

const indicatorPath = indicatorDetailPath;

export async function DirekturDashboardPage() {
  const { month, year } = currentPeriod();

  const [
    indicators,
    units,
    monthObservations,
    pendingAnalyses,
    approvedAnalyses,
    rejectedAnalyses,
  ] = await Promise.all([
    prisma.indicator.findMany({
      where: { isActive: true },
      include: { unit: true },
      orderBy: [{ unit: { orderNo: "asc" } }, { orderNo: "asc" }],
    }),
    prisma.unit.findMany({
      orderBy: { orderNo: "asc" },
      include: { indicators: { where: { isActive: true } } },
    }),
    prisma.observation.findMany({
      where: {
        observationDate: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
      },
    }),
    prisma.analysis.count({ where: { status: "SUBMITTED" } }),
    prisma.analysis.count({
      where: {
        status: "APPROVED",
        periodMonth: month,
        periodYear: year,
      },
    }),
    prisma.analysis.count({
      where: {
        status: "REJECTED",
        periodMonth: month,
        periodYear: year,
      },
    }),
  ]);

  const perIndicator = indicators.map((ind) => {
    const obs = monthObservations.filter((o) => o.indicatorId === ind.id);
    const num = obs.reduce((s, o) => s + o.numeratorValue, 0);
    const den = obs.reduce((s, o) => s + o.denominatorValue, 0);
    const p = den > 0 ? (num / den) * 100 : 0;
    const target = Number(ind.targetPct);
    const isInverse = target === 0;
    const achieved = isInverse ? den === 0 || num === 0 : den > 0 && p >= target;
    return {
      id: ind.id,
      code: ind.code,
      title: ind.title,
      category: ind.category,
      unitCode: ind.unit.code,
      unitName: ind.unit.name,
      numerator: num,
      denominator: den,
      pct: p,
      target,
      isInverse,
      achieved,
      hasData: den > 0,
    };
  });

  const totalIndicators = perIndicator.length;
  const totalWithData = perIndicator.filter((p) => p.hasData).length;
  const totalAchieved = perIndicator.filter((p) => p.achieved).length;
  const totalObs = monthObservations.length;

  const byCategory = (cat: IndicatorCategory) => {
    const list = perIndicator.filter((p) => p.category === cat);
    const achieved = list.filter((p) => p.achieved).length;
    return {
      category: cat,
      total: list.length,
      achieved,
      pct: list.length === 0 ? 0 : Math.round((achieved / list.length) * 100),
    };
  };

  const inmStats = byCategory("INM");
  const impStats = byCategory("IMP");
  const impRsStats = byCategory("IMP_RS");
  const imkStats = byCategory("IMK");

  const globalPct =
    totalIndicators === 0
      ? 0
      : Math.round((totalAchieved / totalIndicators) * 100);

  const avgTarget =
    totalIndicators === 0
      ? 0
      : Math.round(
          perIndicator.reduce((s, p) => s + p.target, 0) / totalIndicators
        );

  // Trend bulanan 6 bulan terakhir (INM + IMP gabungan)
  const trend6 = await computeMonthlyTrend({ months: 6 });
  // Perbandingan unit bulan ini
  const unitComparison = await computeUnitComparison({ year, month });
  // Perbandingan unit 3 bulan lalu untuk delta
  const threeMonthsAgo = (() => {
    let m = month - 3;
    let y = year;
    if (m < 1) {
      m += 12;
      y -= 1;
    }
    return { m, y };
  })();
  const unitComparisonPrev = await computeUnitComparison({
    year: threeMonthsAgo.y,
    month: threeMonthsAgo.m,
  });
  const prevPctByUnit = new Map(
    unitComparisonPrev.map((u) => [u.unitCode, u.pct])
  );

  // Indikator bermasalah (pencapaian terendah & belum tercapai)
  const problemIndicators = [...perIndicator]
    .filter((p) => p.hasData && !p.achieved)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 8);

  // Indikator terbaik
  const topIndicators = [...perIndicator]
    .filter((p) => p.hasData && p.achieved)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Hero banner */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6 text-white shadow-lg shadow-blue-900/20">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-100">
              Dashboard Direktur · {monthLabel(month)} {year}
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold sm:text-3xl">
              <Hospital className="h-7 w-7 text-blue-200" />
              RS Royal Prima Jambi
            </h2>
            <p className="mt-2 text-sm text-blue-50/90">
              Ringkasan executive indikator mutu INM + IMP
              <span className="mx-2 text-blue-200">·</span>
              {units.length} unit aktif
              <span className="mx-2 text-blue-200">·</span>
              {totalIndicators} indikator total
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/20 backdrop-blur">
            <Target className="h-9 w-9 text-blue-100" />
            <div>
              <div className="text-xs text-blue-100">Pencapaian Global</div>
              <div className="text-3xl font-bold leading-tight">
                {totalIndicators === 0 ? "—" : `${globalPct}%`}
              </div>
              <div className="text-xs text-blue-100">
                {totalAchieved}/{totalIndicators} indikator tercapai
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Indikator"
          value={totalIndicators.toString()}
          subtitle={`INM ${inmStats.total} · IMP Unit ${impStats.total} · IMP RS ${impRsStats.total} · IMK ${imkStats.total}`}
          icon={ListChecks}
          tone="emerald"
        />
        <StatCard
          label="Tercapai Bulan Ini"
          value={`${totalAchieved}/${totalIndicators}`}
          subtitle={`${globalPct}% dari total`}
          icon={CheckCircle2}
          tone="teal"
        />
        <StatCard
          label="Total Observasi"
          value={totalObs.toString()}
          subtitle={`Per ${monthLabel(month)} ${year}`}
          icon={Activity}
          tone="sky"
        />
        <StatCard
          label="Menunggu Approval"
          value={pendingAnalyses.toString()}
          subtitle="Perlu ditinjau Komite Mutu"
          icon={AlertTriangle}
          tone="amber"
        />
        <StatCard
          label="Total Unit"
          value={units.length.toString()}
          subtitle="Seluruh unit rumah sakit"
          icon={Building2}
          tone="indigo"
        />
      </div>

      {totalIndicators === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          Belum ada indikator aktif di sistem.
        </div>
      ) : (
        <>
          {/* Trend 6 bulan + approved/rejected */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    Tren Pencapaian 6 Bulan Terakhir
                  </h3>
                  <p className="text-xs text-slate-500">
                    Akumulasi INM + IMP · target rata-rata {avgTarget}%
                  </p>
                </div>
              </div>
              <MonthlyTrendChart data={trend6} target={avgTarget} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-1 text-sm font-bold text-slate-900">
                Status Workflow Analisa
              </h3>
              <p className="text-xs text-slate-500">
                {monthLabel(month)} {year}
              </p>
              <div className="mt-4 space-y-3">
                <StatusRow
                  label="Menunggu Approval"
                  value={pendingAnalyses}
                  tone="amber"
                />
                <StatusRow
                  label="Approved Bulan Ini"
                  value={approvedAnalyses}
                  tone="emerald"
                />
                <StatusRow
                  label="Rejected Bulan Ini"
                  value={rejectedAnalyses}
                  tone="red"
                />
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Indikator tdk ada data</span>
                    <span className="font-bold text-slate-700">
                      {totalIndicators - totalWithData}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Indikator tercapai per bulan bar chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Jumlah Indikator Tercapai per Bulan
              </h3>
              <p className="text-xs text-slate-500">
                Perbandingan indikator tercapai vs total selama 6 bulan
              </p>
            </div>
            <MonthlyAchievedChart data={trend6} />
          </div>

          {/* Perbandingan antar unit */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Perbandingan Pencapaian antar Unit
                </h3>
                <p className="text-xs text-slate-500">
                  {monthLabel(month)} {year} · hijau = tercapai, kuning =
                  mendekati target, merah = jauh dari target
                </p>
              </div>
            </div>
            <UnitComparisonChart data={unitComparison} target={avgTarget} />
          </div>

          {/* Category breakdown */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {([
              { stats: inmStats, color: "emerald" as const },
              { stats: impStats, color: "sky" as const },
              { stats: impRsStats, color: "indigo" as const },
              { stats: imkStats, color: "violet" as const },
            ]).map(({ stats, color }) => {
              const tone =
                color === "emerald"
                  ? "from-emerald-50 to-teal-50 border-emerald-200"
                  : color === "sky"
                  ? "from-sky-50 to-blue-50 border-sky-200"
                  : color === "indigo"
                  ? "from-indigo-50 to-violet-50 border-indigo-200"
                  : "from-violet-50 to-purple-50 border-violet-200";
              const titleColor =
                color === "emerald"
                  ? "text-emerald-700"
                  : color === "sky"
                  ? "text-sky-700"
                  : color === "indigo"
                  ? "text-indigo-700"
                  : "text-violet-700";
              const badge =
                color === "emerald"
                  ? "bg-emerald-100 text-emerald-700"
                  : color === "sky"
                  ? "bg-sky-100 text-sky-700"
                  : color === "indigo"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-violet-100 text-violet-700";
              return (
                <div
                  key={stats.category}
                  className={`rounded-2xl border bg-gradient-to-br p-5 ${tone}`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className={`text-base font-bold ${titleColor}`}>
                      Kategori {CATEGORY_LABEL[stats.category]}
                    </h3>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${badge}`}
                    >
                      {stats.pct}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-white/70 p-3">
                      <div className="text-2xl font-bold text-slate-900">
                        {stats.total}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Total Indikator
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/70 p-3">
                      <div className="text-2xl font-bold text-emerald-700">
                        {stats.achieved}
                      </div>
                      <div className="text-[11px] text-slate-500">Tercapai</div>
                    </div>
                    <div className="rounded-lg bg-white/70 p-3">
                      <div className="text-2xl font-bold text-red-600">
                        {stats.total - stats.achieved}
                      </div>
                      <div className="text-[11px] text-slate-500">Belum</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Indikator bermasalah + per unit detail */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            {/* Problem indicators */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Indikator Perlu Perhatian
                  </h3>
                  <p className="text-xs text-slate-500">
                    Indikator belum tercapai · pencapaian terendah
                  </p>
                </div>
              </div>
              {problemIndicators.length === 0 ? (
                <div className="rounded-lg bg-emerald-50 p-6 text-center text-xs text-emerald-700">
                  Semua indikator tercapai bulan ini.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {problemIndicators.map((p) => (
                    <Link
                      key={p.id}
                      href={indicatorPath(p.category, p.id)}
                      className="flex items-center gap-3 py-2.5 transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-slate-500">
                            {p.code}
                          </span>
                          <span
                            className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold ${
                              p.category === "IMP"
                                ? "bg-sky-100 text-sky-700"
                                : p.category === "IMP_RS"
                                ? "bg-indigo-100 text-indigo-700"
                                : p.category === "IMK"
                                ? "bg-violet-100 text-violet-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {CATEGORY_LABEL[p.category]}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {p.unitCode}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate text-xs font-medium text-slate-800">
                          {p.title}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-red-600 tabular-nums">
                          {p.isInverse ? "≤ " : "≥ "}
                          {p.pct.toFixed(0)}%
                        </div>
                        <div className="text-[10px] text-slate-400">
                          /{p.isInverse ? "0" : `${p.target}%`}
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Top indicators */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
              <div className="mb-3">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Indikator Terbaik
                </h3>
                <p className="text-xs text-slate-500">
                  Pencapaian tertinggi bulan ini
                </p>
              </div>
              {topIndicators.length === 0 ? (
                <div className="rounded-lg bg-slate-50 p-6 text-center text-xs text-slate-500">
                  Belum ada indikator tercapai.
                </div>
              ) : (
                <ul className="space-y-2">
                  {topIndicators.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={indicatorPath(p.category, p.id)}
                        className="block rounded-lg border border-slate-200 p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                            {p.code}
                          </span>
                          <span
                            className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              p.category === "IMP"
                                ? "bg-sky-100 text-sky-700"
                                : p.category === "IMP_RS"
                                ? "bg-indigo-100 text-indigo-700"
                                : p.category === "IMK"
                                ? "bg-violet-100 text-violet-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {CATEGORY_LABEL[p.category]}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {p.unitCode}
                          </span>
                          <span className="ml-auto text-xs font-bold text-emerald-700 tabular-nums">
                            {p.pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="mt-1 truncate text-xs font-medium text-slate-800">
                          {p.title}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Detail per unit dengan delta 3 bulan */}
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-900">
                Detail Pencapaian per Unit
              </h3>
              <p className="text-xs text-slate-500">
                Performa {monthLabel(month)} {year} + perubahan vs{" "}
                {monthLabel(threeMonthsAgo.m)} {threeMonthsAgo.y}
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {unitComparison
                .slice()
                .sort((a, b) => b.pct - a.pct)
                .map((u) => {
                  const prevPct = prevPctByUnit.get(u.unitCode);
                  const delta =
                    prevPct !== undefined ? u.pct - prevPct : null;
                  return (
                    <Link
                      key={u.unitCode}
                      href={`/indikator?unit=${u.unitCode}`}
                      className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-emerald-700">
                            {u.unitCode}
                          </span>
                          <span className="truncate text-sm font-semibold text-slate-900">
                            {u.unitName}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          <strong className="text-emerald-700">
                            {u.achievedCount}
                          </strong>
                          /{u.totalCount} indikator tercapai
                          {delta !== null && (
                            <span className="ml-2">
                              ·{" "}
                              <span
                                className={
                                  delta > 0
                                    ? "text-emerald-600"
                                    : delta < 0
                                    ? "text-red-600"
                                    : "text-slate-500"
                                }
                              >
                                {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"}{" "}
                                {Math.abs(delta).toFixed(0)}%
                              </span>
                              {" "}
                              <span className="text-slate-400">vs 3 bln lalu</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="hidden items-center gap-2 sm:flex">
                        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all ${
                              u.pct >= avgTarget
                                ? "bg-emerald-500"
                                : u.pct >= avgTarget * 0.8
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(100, u.pct)}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-24 text-right">
                        <div
                          className={`text-lg font-bold tabular-nums ${
                            u.pct >= avgTarget
                              ? "text-emerald-700"
                              : u.pct >= avgTarget * 0.8
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {u.pct.toFixed(0)}%
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </Link>
                  );
                })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "emerald" | "teal" | "sky" | "amber" | "indigo";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-600",
    teal: "bg-teal-50 text-teal-600",
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md hover:shadow-slate-200/60">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className={`rounded-lg p-2 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "emerald" | "red";
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-xs text-slate-600">{label}</span>
      <span
        className={`inline-flex min-w-[2rem] justify-center rounded-full px-2 py-0.5 text-xs font-bold ${tones[tone]}`}
      >
        {value}
      </span>
    </div>
  );
}
