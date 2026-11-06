import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ALL_UNITS_ROLES } from "@/lib/auth-helpers";
import { todayYmd } from "@/lib/date-window";
import { getRestrictEditWindow } from "@/lib/app-settings";
import { CATEGORY_LABEL } from "@/lib/utils";
import { InputForm } from "@/components/input-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { IndicatorCategory } from "@prisma/client";

export async function InputPage({
  category,
  inputBasePath,
  dashboardBasePath,
  searchParams,
}: {
  category: IndicatorCategory;
  inputBasePath: string;
  dashboardBasePath: string;
  searchParams: Promise<{
    indicator?: string;
    month?: string;
    year?: string;
  }>;
}) {
  const session = await auth();
  const user = session!.user;
  const isAllUnits = (ALL_UNITS_ROLES as readonly string[]).includes(user.role);
  const sp = await searchParams;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const today = todayYmd();
  const restrictWindow = await getRestrictEditWindow();

  // Periode yang dilihat — default bulan berjalan; bulan lalu bersifat view-only
  const spYear = sp.year ? Number(sp.year) : NaN;
  const spMonth = sp.month ? Number(sp.month) : NaN;
  const year =
    Number.isFinite(spYear) && spYear >= 2020 && spYear <= currentYear
      ? Math.floor(spYear)
      : currentYear;
  const month =
    Number.isFinite(spMonth) && spMonth >= 1 && spMonth <= 12
      ? Math.floor(spMonth)
      : currentMonth;
  const isCurrentPeriod = year === currentYear && month === currentMonth;
  const viewOnly = !isCurrentPeriod;
  const availableYears = [currentYear, currentYear - 1, currentYear - 2].filter(
    (y) => y >= 2020
  );

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, nik: true },
  });

  const indicatorsRaw = await prisma.indicator.findMany({
    where: {
      category,
      ...(isAllUnits ? {} : { unitId: user.unitId! }),
    },
    include: {
      unit: true,
      observations: {
        where: {
          observationDate: {
            gte: new Date(Date.UTC(year, month - 1, 1)),
            lt: new Date(Date.UTC(year, month, 1)),
          },
        },
        select: {
          observationDate: true,
          numeratorValue: true,
          denominatorValue: true,
        },
      },
      analyses: {
        where: {
          periodMonth: month,
          periodYear: year,
        },
        take: 1,
      },
    },
    orderBy: [{ unit: { orderNo: "asc" } }, { orderNo: "asc" }],
  });

  const indicators = indicatorsRaw.map((i) => {
    const analysis = i.analyses[0];
    return {
      id: i.id,
      code: i.code,
      title: i.title,
      numeratorLabel: i.numeratorLabel,
      denominatorLabel: i.denominatorLabel,
      targetPct: Number(i.targetPct),
      unit: { code: i.unit.code, name: i.unit.name },
      observations: i.observations.map((o) => ({
        observationDate: o.observationDate.toISOString(),
        numeratorValue: o.numeratorValue,
        denominatorValue: o.denominatorValue,
      })),
      analysis: analysis
        ? {
            id: analysis.id,
            analisaText: analysis.analisaText ?? "",
            pdsaPlan: analysis.pdsaPlan ?? "",
            pdsaDo: analysis.pdsaDo ?? "",
            pdsaStudy: analysis.pdsaStudy ?? "",
            pdsaAct: analysis.pdsaAct ?? "",
            dataCollector: analysis.dataCollector ?? "",
            picName: analysis.picName ?? "",
            picNik: analysis.picNik ?? "",
            status: analysis.status,
            rejectionNote: analysis.rejectionNote ?? "",
          }
        : null,
    };
  });

  const selected = sp.indicator
    ? indicators.find((i) => i.id === sp.indicator)
    : indicators[0];

  if (indicators.length === 0) {
    return (
      <div className="space-y-5">
        <Link
          href={dashboardBasePath}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          Tidak ada indikator {CATEGORY_LABEL[category]} yang dapat di-input.
        </div>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="space-y-5">
        <Link
          href={dashboardBasePath}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          Indikator tidak ditemukan.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href={dashboardBasePath}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
      >
        <ChevronLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Input Data Harian {CATEGORY_LABEL[category]}
        </h2>
        <p className="text-sm text-slate-500">
          Pilih indikator lalu isi data harian, analisa, dan PDSA untuk periode
          bulan berjalan. Bulan-bulan sebelumnya dapat dibuka melalui pilihan
          periode untuk dilihat (read-only) sebagai bahan laporan.
        </p>
      </div>

      <InputForm
        indicators={indicators}
        selectedId={selected.id}
        year={year}
        month={month}
        today={today}
        restrictWindow={restrictWindow}
        viewOnly={viewOnly}
        currentYear={currentYear}
        currentMonth={currentMonth}
        availableYears={availableYears}
        currentUserName={me?.name ?? user.name}
        currentUserNik={me?.nik ?? null}
        inputBasePath={inputBasePath}
      />
    </div>
  );
}
