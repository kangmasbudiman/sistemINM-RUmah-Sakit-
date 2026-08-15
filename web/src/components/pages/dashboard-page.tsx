import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ALL_UNITS_ROLES, canApprove } from "@/lib/auth-helpers";
import type { IndicatorCategory } from "@prisma/client";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ListChecks,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { monthLabel, CATEGORY_LABEL } from "@/lib/utils";
import {
  AchievementDonut,
  DailyTrendChart,
  IndicatorBarChart,
} from "@/components/dashboard/charts";

function currentPeriod() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function pct(num: number, den: number): number {
  if (!den) return 0;
  return (num / den) * 100;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export async function DashboardPage({
  category,
  indicatorBasePath,
}: {
  category: IndicatorCategory;
  indicatorBasePath: string;
}) {
  const session = await auth();
  const user = session!.user;
  const isAllUnits = (ALL_UNITS_ROLES as readonly string[]).includes(user.role);
  const { month, year } = currentPeriod();
  const catLabel = CATEGORY_LABEL[category];

  const unitFilter = isAllUnits ? undefined : { unitId: user.unitId! };

  const [indicators, units, pendingAnalyses, monthObservations] =
    await Promise.all([
      prisma.indicator.findMany({
        where: {
          category,
          ...(unitFilter ?? {}),
        },
        include: { unit: true },
        orderBy: [{ unit: { orderNo: "asc" } }, { orderNo: "asc" }],
      }),
      isAllUnits
        ? prisma.unit.findMany({
            orderBy: { orderNo: "asc" },
            include: { indicators: { where: { category } } },
          })
        : Promise.resolve([]),
      prisma.analysis.count({
        where: {
          status: "SUBMITTED",
          indicator: { category },
          ...(unitFilter ?? {}),
        },
      }),
      prisma.observation.findMany({
        where: {
          indicator: { category },
          ...(unitFilter ?? {}),
          observationDate: {
            gte: new Date(year, month - 1, 1),
            lt: new Date(year, month, 1),
          },
        },
      }),
    ]);

  const daysInMonth = new Date(year, month, 0).getDate();

  const perIndicator = indicators.map((ind) => {
    const obs = monthObservations.filter(
      (o) => o.indicatorId === ind.id
    );
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

  // Daily trend (aggregated across all visible indicators per day)
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
    return {
      day,
      num,
      den,
      pct: den > 0 ? (num / den) * 100 : 0,
    };
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
    const achieved = inds.filter((p) => p.achieved).length;
    return {
      code: u.code,
      name: u.name,
      total: inds.length,
      achieved,
      indicators: inds,
    };
  });

  return (
    <div className="space-y-5">
      {/* Hero banner */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-600 p-6 text-white shadow-lg shadow-emerald-600/20">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-100">
              Selamat datang
            </p>
            <h2 className="mt-1 truncate text-2xl font-bold sm:text-3xl">
              {user.name}
            </h2>
            <p className="mt-2 text-sm text-emerald-50/90">
              {isAllUnits
                ? "Akses seluruh unit rumah sakit"
                : `Unit ${user.unitName ?? "-"}`}
              <span className="mx-2 text-emerald-200">·</span>
              Indikator {catLabel}
              <span className="mx-2 text-emerald-200">·</span>
              {monthLabel(month)} {year}
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={`Total Indikator ${catLabel}`}
          value={totalIndicators.toString()}
          subtitle={isAllUnits ? "Seluruh unit" : `Unit ${user.unitName}`}
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
          subtitle={
            canApprove(user) ? "Perlu ditinjau" : "Diproses Komite Mutu"
          }
          icon={Clock}
          tone="amber"
        />
      </div>

      {totalIndicators === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          Belum ada indikator {catLabel} di unit Anda. Hubungi admin.
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
                    Tren Pencapaian Harian
                  </h3>
                  <p className="text-xs text-slate-500">
                    Akumulasi seluruh indikator {catLabel} ·{" "}
                    {monthLabel(month)} {year}
                  </p>
                </div>
                <div className="hidden items-center gap-3 text-[11px] sm:flex">
                  <Legend color="#059669" label="Pencapaian" />
                  <Legend color="#f59e0b" label={`Target rata-rata ${avgTarget}%`} dashed />
                </div>
              </div>
              <DailyTrendChart data={trend} target={avgTarget} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-1 text-sm font-bold text-slate-900">
                Capaian vs Target
              </h3>
              <p className="text-xs text-slate-500">
                Proporsi indikator yang sudah tercapai
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

          {/* Indicator bar chart + per-unit */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-3">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Pencapaian per Indikator
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bar hijau = tercapai · merah = belum · garis amber = target
                  </p>
                </div>
              </div>
              <IndicatorBarChart
                data={perIndicator.map((p) => ({
                  id: p.id,
                  code: p.code,
                  title: p.title,
                  pct: p.pct,
                  target: p.target,
                  achieved: p.achieved,
                }))}
                target={avgTarget}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
              <h3 className="mb-1 text-sm font-bold text-slate-900">
                {isAllUnits ? "Pencapaian per Unit" : "Ringkasan Indikator"}
              </h3>
              <p className="mb-3 text-xs text-slate-500">
                {isAllUnits
                  ? "Klik unit untuk melihat detail indikatornya"
                  : "Status pencapaian unit Anda"}
              </p>
              <div className="space-y-2">
                {isAllUnits && perUnit.length > 0
                  ? perUnit.map((u) => (
                      <Link
                        key={u.code}
                        href={`${indicatorBasePath}?unit=${u.code}`}
                        className="group block rounded-lg border border-slate-200 p-3 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                {u.code}
                              </span>
                              <span className="truncate text-xs font-semibold text-slate-800">
                                {u.name}
                              </span>
                            </div>
                          </div>
                          <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600" />
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{
                                width: `${
                                  u.total === 0
                                    ? 0
                                    : (u.achieved / u.total) * 100
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-bold tabular-nums text-slate-700">
                            {u.achieved}/{u.total}
                          </span>
                        </div>
                      </Link>
                    ))
                  : perIndicator.slice(0, 6).map((p) => (
                      <Link
                        key={p.id}
                        href={`${indicatorBasePath}/${p.id}`}
                        className="block rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] text-slate-500">
                                {p.code}
                              </span>
                              {p.achieved && (
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              )}
                            </div>
                            <div className="mt-0.5 truncate text-xs font-medium text-slate-800">
                              {p.title}
                            </div>
                          </div>
                          <div className="text-right">
                            <div
                              className={`text-sm font-bold tabular-nums ${
                                p.achieved
                                  ? "text-emerald-700"
                                  : "text-red-600"
                              }`}
                            >
                              {p.pct.toFixed(0)}%
                            </div>
                            <div className="text-[10px] text-slate-400">
                              /{p.target}%
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
              </div>
            </div>
          </div>

          {/* Detail list */}
          <div className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Detail Pencapaian Indikator {catLabel}
                </h3>
                <p className="text-xs text-slate-500">
                  Klik untuk input data harian atau lihat detail
                </p>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {perIndicator.map((p) => (
                <Link
                  key={p.id}
                  href={`${indicatorBasePath}/${p.id}`}
                  className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                        {p.code}
                      </span>
                      {p.achieved ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Tercapai
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                          Belum
                        </span>
                      )}
                    </div>
                    <div className="mt-1 truncate text-sm font-medium text-slate-900">
                      {p.title}
                    </div>
                    {isAllUnits && (
                      <div className="text-xs text-slate-500">
                        {p.unitName} ({p.unitCode})
                      </div>
                    )}
                  </div>
                  <div className="hidden text-right text-xs text-slate-500 sm:block">
                    <div>
                      Pembilang:{" "}
                      <strong className="text-slate-700">{p.numerator}</strong>
                    </div>
                    <div>
                      Penyebut:{" "}
                      <strong className="text-slate-700">{p.denominator}</strong>
                    </div>
                  </div>
                  <div className="w-24 text-right">
                    <div
                      className={`text-lg font-bold tabular-nums ${
                        p.achieved ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {p.pct.toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-500">
                      Target: {p.isInverse ? "≤ " : "≥ "}
                      {p.target}%
                    </div>
                  </div>
                </Link>
              ))}
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
  tone: "emerald" | "teal" | "sky" | "amber";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-600",
    teal: "bg-teal-50 text-teal-600",
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
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

function Legend({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-600">
      <span
        className={`inline-block h-0.5 w-4 ${
          dashed ? "border-t-2 border-dashed" : ""
        }`}
        style={dashed ? { borderColor: color } : { backgroundColor: color }}
      />
      {label}
    </span>
  );
}
