import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canApprove } from "@/lib/auth-helpers";
import type { IndicatorCategory } from "@prisma/client";
import {
  Activity,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  Hospital,
  ListChecks,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { monthLabel, CATEGORY_LABEL, indicatorDetailPath } from "@/lib/utils";
import {
  AchievementDonut,
  DailyTrendChart,
  IndicatorBarChart,
} from "@/components/dashboard/charts";
import {
  MonthlyAchievedChart,
  MonthlyTrendChart,
} from "@/components/charts/trend-charts";
import { computeMonthlyTrend } from "@/lib/monthly-trend";

function currentPeriod() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function pct(num: number, den: number): number {
  if (!den) return 0;
  return (num / den) * 100;
}

const indicatorPath = indicatorDetailPath;

export async function AdminDashboardPage() {
  const session = await auth();
  const user = session!.user;
  const { month, year } = currentPeriod();

  const [
    indicators,
    units,
    monthObservations,
    pendingAnalyses,
    recentSubmissions,
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
    prisma.analysis.count({
      where: {
        status: "SUBMITTED",
      },
    }),
    prisma.analysis.findMany({
      where: { status: "SUBMITTED" },
      include: {
        indicator: { include: { unit: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: 6,
    }),
  ]);

  const daysInMonth = new Date(year, month, 0).getDate();

  const perIndicator = indicators.map((ind) => {
    const obs = monthObservations.filter((o) => o.indicatorId === ind.id);
    const num = obs.reduce((s, o) => s + o.numeratorValue, 0);
    const den = obs.reduce((s, o) => s + o.denominatorValue, 0);
    const p = pct(num, den);
    const target = Number(ind.targetPct);
    const isInverse = target === 0;
    const achieved = isInverse ? den === 0 || p <= 0 : p >= target;
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
    };
  });

  const totalIndicators = perIndicator.length;
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
      list,
    };
  };

  const inmStats = byCategory("INM");
  const impStats = byCategory("IMP");
  const impRsStats = byCategory("IMP_RS");
  const imkStats = byCategory("IMK");

  const trend = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dayObs = monthObservations.filter((o) => {
      const d = new Date(o.observationDate);
      return (
        d.getFullYear() === year &&
        d.getMonth() + 1 === month &&
        d.getDate() === day
      );
    });
    const num = dayObs.reduce((s, o) => s + o.numeratorValue, 0);
    const den = dayObs.reduce((s, o) => s + o.denominatorValue, 0);
    return { day, num, den, pct: den > 0 ? (num / den) * 100 : 0 };
  });

  const avgTarget =
    totalIndicators === 0
      ? 0
      : Math.round(
          perIndicator.reduce((s, p) => s + p.target, 0) / totalIndicators
        );

  const globalPct =
    totalIndicators === 0
      ? 0
      : Math.round((totalAchieved / totalIndicators) * 100);

  const perUnit = units.map((u) => {
    const inds = perIndicator.filter((p) => p.unitCode === u.code);
    const achievedCount = inds.filter((p) => p.achieved).length;
    const inm = inds.filter((p) => p.category === "INM");
    const imp = inds.filter((p) => p.category === "IMP");
    const impRs = inds.filter((p) => p.category === "IMP_RS");
    const imk = inds.filter((p) => p.category === "IMK");
    // Performa aggregate unit: sum numerator / sum denominator
    const sumNum = inds.reduce((s, p) => s + p.numerator, 0);
    const sumDen = inds.reduce((s, p) => s + p.denominator, 0);
    const performance = sumDen > 0 ? Math.round((sumNum / sumDen) * 100) : 0;
    // Target rata-rata indikator di unit ini
    const unitAvgTarget =
      inds.length === 0
        ? 0
        : Math.round(inds.reduce((s, p) => s + p.target, 0) / inds.length);
    return {
      id: u.id,
      code: u.code,
      name: u.name,
      total: inds.length,
      achieved: achievedCount,
      pct: performance,
      unitAvgTarget,
      inmTotal: inm.length,
      inmAchieved: inm.filter((p) => p.achieved).length,
      impTotal: imp.length,
      impAchieved: imp.filter((p) => p.achieved).length,
      impRsTotal: impRs.length,
      impRsAchieved: impRs.filter((p) => p.achieved).length,
      imkTotal: imk.length,
      imkAchieved: imk.filter((p) => p.achieved).length,
    };
  });

  const canReview = canApprove(user);

  // Trend bulanan 6 bulan (gabungan INM + IMP)
  const trend6 = await computeMonthlyTrend({ months: 6 });

  return (
    <div className="space-y-5">
      {/* Hero banner */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6 text-white shadow-lg shadow-emerald-900/20">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-100">
              Dashboard Utama · {monthLabel(month)} {year}
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold sm:text-3xl">
              <Hospital className="h-7 w-7 text-emerald-200" />
              RS Royal Prima Jambi
            </h2>
            <p className="mt-2 text-sm text-emerald-50/90">
              Akumulasi seluruh indikator INM + IMP
              <span className="mx-2 text-emerald-200">·</span>
              {units.length} unit aktif
              <span className="mx-2 text-emerald-200">·</span>
              {totalIndicators} indikator total
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-4 ring-1 ring-white/20 backdrop-blur">
            <Target className="h-9 w-9 text-emerald-100" />
            <div>
              <div className="text-xs text-emerald-100">Pencapaian Global</div>
              <div className="text-3xl font-bold leading-tight">
                {totalIndicators === 0 ? "—" : `${globalPct}%`}
              </div>
              <div className="text-xs text-emerald-100">
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
          subtitle={canReview ? "Perlu ditinjau" : "Diproses Komite Mutu"}
          icon={Clock}
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
          Belum ada indikator aktif di sistem. Tambahkan via Master Data.
        </div>
      ) : (
        <>
          {/* Trend + Donut row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    Tren Pencapaian Harian Gabungan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Akumulasi INM + IMP · {monthLabel(month)} {year}
                  </p>
                </div>
                <div className="hidden items-center gap-3 text-[11px] sm:flex">
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <span className="inline-block h-0.5 w-4 bg-emerald-600" />
                    Pencapaian
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-amber-500" />
                    Target rata-rata {avgTarget}%
                  </span>
                </div>
              </div>
              <DailyTrendChart data={trend} target={avgTarget} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-1 text-sm font-bold text-slate-900">
                Capaian vs Target
              </h3>
              <p className="text-xs text-slate-500">
                Proporsi seluruh indikator
              </p>
              <AchievementDonut
                achieved={totalAchieved}
                total={totalIndicators}
              />
              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-600">Tercapai</span>
                  </span>
                  <span className="font-bold text-slate-900">
                    {totalAchieved}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-slate-200" />
                    <span className="text-slate-600">Belum tercapai</span>
                  </span>
                  <span className="font-bold text-slate-900">
                    {totalIndicators - totalAchieved}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Trend bulanan 6 bulan */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Tren Bulanan (6 Bulan)
                </h3>
                <p className="text-xs text-slate-500">
                  Akumulasi INM + IMP · target rata-rata {avgTarget}%
                </p>
              </div>
              <MonthlyTrendChart data={trend6} target={avgTarget} />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Jumlah Indikator Tercapai per Bulan
                </h3>
                <p className="text-xs text-slate-500">
                  Bar hijau = tercapai, bar abu = total indikator
                </p>
              </div>
              <MonthlyAchievedChart data={trend6} />
            </div>
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
                      <div className="text-[11px] text-slate-500">
                        Tercapai
                      </div>
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

          {/* Per-unit bar chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Pencapaian per Unit
                </h3>
                <p className="text-xs text-slate-500">
                  Performa aggregate (sum pembilang / sum penyebut) · bar hijau
                  = melebihi target rata-rata unit
                </p>
              </div>
            </div>
            {perUnit.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                Belum ada unit.
              </div>
            ) : (
              <IndicatorBarChart
                data={perUnit.map((u) => ({
                  id: u.id,
                  code: u.code,
                  title: `${u.name} (target ${u.unitAvgTarget}%)`,
                  pct: u.pct,
                  target: u.unitAvgTarget,
                  achieved: u.pct >= u.unitAvgTarget,
                }))}
                target={avgTarget}
              />
            )}
          </div>

          {/* Per-unit detail table */}
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-900">
                Detail Pencapaian per Unit
              </h3>
              <p className="text-xs text-slate-500">
                Klik unit untuk melihat detail indikatornya
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {perUnit.map((u) => (
                <Link
                  key={u.code}
                  href={`/indikator?unit=${u.code}`}
                  className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-emerald-700">
                        {u.code}
                      </span>
                      <span className="truncate text-sm font-semibold text-slate-900">
                        {u.name}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                      <span>
                        INM:{" "}
                        <strong className="text-emerald-700">
                          {u.inmAchieved}
                        </strong>
                        /{u.inmTotal}
                      </span>
                      <span>
                        IMP Unit:{" "}
                        <strong className="text-sky-700">{u.impAchieved}</strong>
                        /{u.impTotal}
                      </span>
                      <span>
                        IMP RS:{" "}
                        <strong className="text-indigo-700">
                          {u.impRsAchieved}
                        </strong>
                        /{u.impRsTotal}
                      </span>
                      {u.imkTotal > 0 && (
                        <span>
                          IMK:{" "}
                          <strong className="text-violet-700">
                            {u.imkAchieved}
                          </strong>
                          /{u.imkTotal}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="hidden items-center gap-2 sm:flex">
                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          u.pct >= u.unitAvgTarget
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                        }`}
                        style={{ width: `${u.pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-24 text-right">
                    <div
                      className={`text-lg font-bold tabular-nums ${
                        u.pct >= u.unitAvgTarget
                          ? "text-emerald-700"
                          : "text-amber-600"
                      }`}
                    >
                      {u.pct}%
                    </div>
                    <div className="text-[11px] text-slate-500">
                      target {u.unitAvgTarget}%
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />
                </Link>
              ))}
            </div>
          </div>

          {/* Recent submissions + indicator detail */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            {/* Pending approvals */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Pengajuan Analisa Terbaru
                  </h3>
                  <p className="text-xs text-slate-500">
                    {canReview
                      ? "Perlu ditinjau Anda"
                      : "Status approval Komite Mutu"}
                  </p>
                </div>
                <Link
                  href="/analisa"
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                >
                  Lihat semua
                </Link>
              </div>
              {recentSubmissions.length === 0 ? (
                <div className="rounded-lg bg-slate-50 p-6 text-center text-xs text-slate-500">
                  Tidak ada pengajuan menunggu.
                </div>
              ) : (
                <ul className="space-y-2">
                  {recentSubmissions.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={indicatorPath(a.indicator.category, a.indicator.id)}
                        className="block rounded-lg border border-slate-200 p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                            {a.indicator.code}
                          </span>
                          <span
                            className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              a.indicator.category === "IMP"
                                ? "bg-sky-100 text-sky-700"
                                : a.indicator.category === "IMP_RS"
                                ? "bg-indigo-100 text-indigo-700"
                                : a.indicator.category === "IMK"
                                ? "bg-violet-100 text-violet-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {CATEGORY_LABEL[a.indicator.category]}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {a.indicator.unit.code}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-xs font-medium text-slate-800">
                          {a.indicator.title}
                        </div>
                        <div className="mt-1 text-[10px] text-slate-400">
                          {a.submittedAt
                            ? new Date(a.submittedAt).toLocaleDateString(
                                "id-ID",
                                { day: "numeric", month: "short", year: "numeric" }
                              )
                            : "-"}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Indicators needing attention (worst performers) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-3">
              <div className="mb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Indikator Perlu Perhatian
                </h3>
                <p className="text-xs text-slate-500">
                  10 indikator dengan pencapaian terendah bulan ini
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {[...perIndicator]
                  .sort((a, b) => a.pct - b.pct)
                  .slice(0, 10)
                  .map((p) => (
                    <Link
                      key={p.id}
                      href={indicatorPath(p.category, p.id)}
                      className="flex items-center gap-3 py-2 transition-colors hover:bg-slate-50"
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
                        <div
                          className={`text-sm font-bold tabular-nums ${
                            p.achieved ? "text-emerald-700" : "text-red-600"
                          }`}
                        >
                          {p.isInverse ? "≤ " : "≥ "}
                          {p.pct.toFixed(0)}%
                        </div>
                        <div className="text-[10px] text-slate-400">
                          /{p.target}%
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
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
