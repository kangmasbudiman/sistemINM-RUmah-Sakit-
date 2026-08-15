import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ALL_UNITS_ROLES, canInputData } from "@/lib/auth-helpers";
import { ChevronLeft, ClipboardList, TrendingUp } from "lucide-react";
import { monthLabel } from "@/lib/utils";
import { computeMonthlyTrend } from "@/lib/monthly-trend";
import { MonthlyTrendChart } from "@/components/charts/trend-charts";

export async function IndicatorDetailPage({
  id,
  listBasePath,
  inputBasePath,
}: {
  id: string;
  listBasePath: string;
  inputBasePath: string;
}) {
  const session = await auth();
  const user = session!.user;
  const isAllUnits = (ALL_UNITS_ROLES as readonly string[]).includes(user.role);

  const indicator = await prisma.indicator.findUnique({
    where: { id },
    include: { unit: true },
  });

  if (!indicator) notFound();
  if (!isAllUnits && indicator.unitId !== user.unitId) {
    notFound();
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const observations = await prisma.observation.findMany({
    where: {
      indicatorId: id,
      observationDate: {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      },
    },
  });

  const num = observations.reduce((s, o) => s + o.numeratorValue, 0);
  const den = observations.reduce((s, o) => s + o.denominatorValue, 0);
  const pct = den === 0 ? 0 : (num / den) * 100;
  const target = Number(indicator.targetPct);
  const isInverse = target === 0;
  const achieved = isInverse ? pct <= 0 : pct >= target;

  // Tren bulanan 12 bulan untuk indikator ini
  const trend12 = await computeMonthlyTrend({
    months: 12,
    indicatorId: indicator.id,
  });

  return (
    <div className="space-y-5">
      <Link
        href={listBasePath}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke daftar indikator
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                {indicator.code}
              </span>
              <span className="inline-flex rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                {indicator.unit.code} · {indicator.unit.name}
              </span>
              <span className="inline-flex rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
                {indicator.category}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              {indicator.title}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-emerald-50 p-3">
                <div className="text-xs font-semibold text-emerald-700">
                  Pembilang
                </div>
                <div className="mt-1 text-sm text-slate-700">
                  {indicator.numeratorLabel}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-700">
                  Penyebut
                </div>
                <div className="mt-1 text-sm text-slate-700">
                  {indicator.denominatorLabel}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Pencapaian {monthLabel(month)} {year}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {pct.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500">
            {achieved ? "✓ Tercapai" : "Belum tercapai"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Total Pembilang</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{num}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs text-slate-500">Total Penyebut</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{den}</p>
        </div>
      </div>

      {canInputData(user) ? (
        <Link
          href={`${inputBasePath}?indicator=${indicator.id}`}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <ClipboardList className="h-4 w-4" />
          Input Data Harian
        </Link>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Anda tidak memiliki izin untuk input data. Hubungi PIC unit.
        </div>
      )}

      {/* Tren bulanan */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Tren Pencapaian 12 Bulan Terakhir
            </h3>
            <p className="text-xs text-slate-500">
              Pencapaian per bulan · target {isInverse ? "0 (lower is better)" : `${target}%`}
            </p>
          </div>
        </div>
        <MonthlyTrendChart
          data={trend12}
          target={isInverse ? 0 : target}
          height={260}
        />
      </div>
    </div>
  );
}
