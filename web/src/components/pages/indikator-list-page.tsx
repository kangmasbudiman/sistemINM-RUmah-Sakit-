import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ALL_UNITS_ROLES } from "@/lib/auth-helpers";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { cn, CATEGORY_LABEL } from "@/lib/utils";
import type { IndicatorCategory } from "@prisma/client";

export async function IndikatorListPage({
  category,
  basePath,
  searchParams,
}: {
  category: IndicatorCategory;
  basePath: string;
  searchParams: Promise<{ unit?: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const isAllUnits = (ALL_UNITS_ROLES as readonly string[]).includes(user.role);
  const sp = await searchParams;

  const units = await prisma.unit.findMany({ orderBy: { orderNo: "asc" } });

  let unitFilterId: string | undefined;
  let activeUnitCode: string | undefined;
  if (isAllUnits && sp.unit) {
    const found = units.find((u) => u.code === sp.unit);
    if (found) {
      unitFilterId = found.id;
      activeUnitCode = found.code;
    }
  } else if (!isAllUnits) {
    unitFilterId = user.unitId ?? undefined;
    activeUnitCode = user.unitCode ?? undefined;
  }

  const indicators = await prisma.indicator.findMany({
    where: {
      category,
      ...(unitFilterId ? { unitId: unitFilterId } : {}),
    },
    include: { unit: true },
    orderBy: [{ unit: { orderNo: "asc" } }, { orderNo: "asc" }],
  });

  const activeUnit = units.find((u) => u.code === activeUnitCode);
  const catLabel = CATEGORY_LABEL[category];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Daftar Indikator {catLabel}
          </h2>
          <p className="text-sm text-slate-500">
            {isAllUnits
              ? `Total ${indicators.length} indikator ${catLabel} di ${
                  activeUnit ? `unit ${activeUnit.code}` : "seluruh unit"
                }`
              : `Indikator ${catLabel} unit ${user.unitName} (${indicators.length})`}
          </p>
        </div>
        {isAllUnits && (
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={basePath}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium",
                !sp.unit
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              Semua Unit
            </Link>
            {units.map((u) => (
              <Link
                key={u.id}
                href={`${basePath}?unit=${u.code}`}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium",
                  sp.unit === u.code
                    ? "bg-emerald-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                {u.code}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3">
        {indicators.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
            Tidak ada indikator {catLabel} pada filter ini.
          </div>
        )}
        {indicators.map((ind) => {
          const target = Number(ind.targetPct);
          const isInverse = target === 0;
          return (
            <Link
              key={ind.id}
              href={`${basePath}/${ind.id}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-emerald-300 hover:shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                      {ind.code}
                    </span>
                    <span className="inline-flex rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                      {ind.unit.code}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded bg-slate-50 px-1.5 py-0.5 text-xs text-slate-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Target: {isInverse ? "≤ 0%" : `≥ ${target}%`}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-slate-900">
                    {ind.title}
                  </h3>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-md bg-emerald-50/50 p-2">
                      <div className="text-xs font-medium text-emerald-700">
                        Pembilang
                      </div>
                      <div className="text-xs text-slate-600">
                        {ind.numeratorLabel}
                      </div>
                    </div>
                    <div className="rounded-md bg-slate-50 p-2">
                      <div className="text-xs font-medium text-slate-700">
                        Penyebut
                      </div>
                      <div className="text-xs text-slate-600">
                        {ind.denominatorLabel}
                      </div>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-300 transition-colors group-hover:text-emerald-500" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
