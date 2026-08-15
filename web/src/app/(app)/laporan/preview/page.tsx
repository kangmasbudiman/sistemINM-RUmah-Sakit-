import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ALL_UNITS_ROLES } from "@/lib/auth-helpers";
import { monthLabel } from "@/lib/utils";
import { PrintControls } from "./print-controls";

export const dynamic = "force-dynamic";

export default async function LaporanPreview({
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

  const allowed = ["ADMIN", "KOMITE_MUTU", "DIREKTUR", "VALIDATOR", "PIC_UNIT"];
  if (!allowed.includes(session.user.role)) redirect("/dashboard");

  const user = session.user;
  const isAllUnits = (ALL_UNITS_ROLES as readonly string[]).includes(user.role);
  const sp = await searchParams;

  const now = new Date();
  const year = sp.year ? Number(sp.year) : now.getFullYear();
  const month = sp.month ? Number(sp.month) : now.getMonth() + 1;
  const category = (sp.category as "INM" | "IMP" | "IMP_RS" | "ALL") ?? "ALL";
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
      orderBy: [{ unit: { orderNo: "asc" } }, { orderNo: "asc" }],
    }),
  ]);

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
        select: { indicatorId: true, numeratorValue: true, denominatorValue: true },
      })
    : [];
  const obsByIndicator = new Map<string, { n: number; d: number }>();
  for (const o of observations) {
    const cur = obsByIndicator.get(o.indicatorId) ?? { n: 0, d: 0 };
    cur.n += o.numeratorValue;
    cur.d += o.denominatorValue;
    obsByIndicator.set(o.indicatorId, cur);
  }

  const analysisByIndicator = new Map(analyses.map((a) => [a.indicatorId, a]));

  const rows = indicatorIds.map((indId) => {
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
      ind,
      obs,
      pct,
      target,
      isInverse,
      achieved,
      analysis: a,
    };
  });

  // Group by unit for per-unit pages
  const groupedByUnit = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = r.ind.unit.code;
    if (!groupedByUnit.has(key)) groupedByUnit.set(key, []);
    groupedByUnit.get(key)!.push(r);
  }

  const totalIndicators = rows.length;
  const totalAchieved = rows.filter((r) => r.achieved).length;
  const totalValidated = rows.filter((r) => r.analysis?.validatedBy).length;
  const totalApproved = rows.filter((r) => r.analysis?.status === "APPROVED").length;
  const achievementPct = totalIndicators > 0
    ? Math.round((totalAchieved / totalIndicators) * 100)
    : 0;

  const periodLabel = `${monthLabel(month)} ${year}`;
  const generatedAt = new Date().toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const unitFilterLabel = sp.unit
    ? units.find((u) => u.code === sp.unit)?.name ?? "Semua Unit"
    : "Semua Unit";
  const categoryLabel = category === "ALL" ? "INM + IMP Unit + IMP RS" : category === "IMP_RS" ? "IMP RS" : category;

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {/* On-screen toolbar — hidden when printing */}
      <PrintControls />

      {/* Printable A4 document */}
      <div className="mx-auto my-8 max-w-[210mm] bg-white p-10 shadow-lg print:my-0 print:max-w-none print:shadow-none print:p-8">
        {/* Kop surat */}
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-lg bg-emerald-700 text-white">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 12h4l2-6 4 12 2-6h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">RS ROYAL PRIMA JAMBI</h1>
              <p className="text-xs text-slate-600">
                Jl. Permata No. 1, Jambi · Telp (0741) 000-0000
              </p>
              <p className="text-xs text-slate-600">Email: info@rsrpjambi.id</p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-600">
            <div className="font-semibold text-slate-900">Sistem INM RS</div>
            <div>Indikator Mutu Nasional</div>
            <div>& Prioritas (IMP)</div>
          </div>
        </div>

        {/* Title */}
        <div className="mt-6 text-center">
          <h2 className="text-xl font-bold uppercase text-slate-900">
            Laporan Pencapaian Indikator Mutu
          </h2>
          <p className="mt-1 text-sm text-slate-700">
            Periode: <span className="font-bold">{periodLabel}</span>
          </p>
          <p className="text-xs text-slate-500">
            Kategori: {categoryLabel} · Cakupan Unit: {unitFilterLabel}
          </p>
        </div>

        {/* Info bar */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-700 print:grid-cols-4">
          <div className="rounded border border-slate-200 p-2">
            <div className="text-[10px] uppercase text-slate-500">Di-generate Oleh</div>
            <div className="font-semibold">{user.name}</div>
            <div className="text-[10px]">{user.email}</div>
          </div>
          <div className="rounded border border-slate-200 p-2">
            <div className="text-[10px] uppercase text-slate-500">Waktu Generate</div>
            <div className="font-semibold">{generatedAt}</div>
          </div>
          <div className="rounded border border-slate-200 p-2">
            <div className="text-[10px] uppercase text-slate-500">Total Indikator</div>
            <div className="font-semibold">{totalIndicators}</div>
          </div>
          <div className="rounded border border-slate-200 p-2">
            <div className="text-[10px] uppercase text-slate-500">Pencapaian</div>
            <div className="font-semibold text-emerald-700">
              {totalAchieved}/{totalIndicators} ({achievementPct}%)
            </div>
          </div>
        </div>

        {/* Ringkasan */}
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-bold uppercase text-slate-800">
            A. Ringkasan Eksekutif
          </h3>
          <table className="w-full border-collapse text-xs">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 pr-4 text-slate-600">Total Indikator Dilaporkan</td>
                <td className="py-1.5 text-right font-bold text-slate-900">{totalIndicators}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 pr-4 text-slate-600">Indikator Tercapai (sesuai target)</td>
                <td className="py-1.5 text-right font-bold text-emerald-700">
                  {totalAchieved} ({achievementPct}%)
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 pr-4 text-slate-600">Indikator Belum Tercapai</td>
                <td className="py-1.5 text-right font-bold text-amber-700">
                  {totalIndicators - totalAchieved}
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 pr-4 text-slate-600">Sudah Divalidasi Kepala Ruangan</td>
                <td className="py-1.5 text-right font-bold text-sky-700">{totalValidated}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-1.5 pr-4 text-slate-600">Sudah Disetujui Komite Mutu</td>
                <td className="py-1.5 text-right font-bold text-indigo-700">{totalApproved}</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-4 text-slate-600">Jumlah Unit Dilaporkan</td>
                <td className="py-1.5 text-right font-bold text-slate-900">{groupedByUnit.size}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Per-unit breakdown */}
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-bold uppercase text-slate-800">
            B. Detail Pencapaian per Unit
          </h3>

          {groupedByUnit.size === 0 && (
            <p className="rounded border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
              Tidak ada data pada filter ini.
            </p>
          )}

          {Array.from(groupedByUnit.entries()).map(([unitCode, unitRows]) => {
            const unitName = unitRows[0].ind.unit.name;
            const unitAchieved = unitRows.filter((r) => r.achieved).length;
            const unitPct = unitRows.length > 0
              ? Math.round((unitAchieved / unitRows.length) * 100)
              : 0;
            return (
              <div key={unitCode} className="mb-4 break-inside-avoid">
                <div className="mb-1 flex items-center justify-between border-b border-slate-300 pb-1">
                  <div className="text-sm font-bold text-slate-900">
                    {unitCode} · {unitName}
                  </div>
                  <div className="text-xs text-slate-600">
                    {unitAchieved}/{unitRows.length} tercapai ({unitPct}%)
                  </div>
                </div>
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-50 text-left">
                      <th className="px-1.5 py-1 font-semibold text-slate-700">Kode</th>
                      <th className="px-1.5 py-1 font-semibold text-slate-700">Indikator</th>
                      <th className="px-1.5 py-1 text-center font-semibold text-slate-700">Pembilang</th>
                      <th className="px-1.5 py-1 text-center font-semibold text-slate-700">Penyebut</th>
                      <th className="px-1.5 py-1 text-center font-semibold text-slate-700">Pencapaian</th>
                      <th className="px-1.5 py-1 text-center font-semibold text-slate-700">Target</th>
                      <th className="px-1.5 py-1 text-center font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unitRows.map((r) => (
                      <tr key={r.ind.id} className="border-b border-slate-100">
                        <td className="px-1.5 py-1 font-mono text-[10px] text-slate-600">{r.ind.code}</td>
                        <td className="px-1.5 py-1 text-slate-800">{r.ind.title}</td>
                        <td className="px-1.5 py-1 text-center tabular-nums">{r.obs.n}</td>
                        <td className="px-1.5 py-1 text-center tabular-nums">{r.obs.d}</td>
                        <td className="px-1.5 py-1 text-center font-bold tabular-nums">
                          {r.obs.d > 0 ? `${r.pct.toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-1.5 py-1 text-center tabular-nums">
                          {r.isInverse ? "≤ 0%" : `≥ ${r.target}%`}
                        </td>
                        <td className="px-1.5 py-1 text-center">
                          {r.analysis?.status ?? "DRAFT"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </section>

        {/* Indikator di bawah target dengan PDSA */}
        {rows.filter((r) => !r.achieved && r.obs.d > 0 && r.analysis).length > 0 && (
          <section className="mt-6">
            <h3 className="mb-2 text-sm font-bold uppercase text-slate-800">
              C. Indikator Belum Tercapai & Analisa PDSA
            </h3>
            {rows
              .filter((r) => !r.achieved && r.obs.d > 0 && r.analysis)
              .map((r) => (
                <div key={`pdsa-${r.ind.id}`} className="mb-3 break-inside-avoid rounded border border-slate-300 p-2.5">
                  <div className="mb-1 text-xs font-bold text-slate-900">
                    {r.ind.code} · {r.ind.title}
                  </div>
                  <div className="mb-1.5 text-[10px] text-slate-600">
                    Unit: {r.ind.unit.code} · Pencapaian: <span className="font-bold text-amber-700">{r.pct.toFixed(1)}%</span> / Target: {r.isInverse ? "≤ 0%" : `≥ ${r.target}%`}
                  </div>
                  {(r.analysis!.analisaText || r.analysis!.pdsaPlan || r.analysis!.pdsaDo || r.analysis!.pdsaStudy || r.analysis!.pdsaAct) && (
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      {r.analysis!.analisaText && (
                        <div className="col-span-2">
                          <div className="font-bold text-slate-700">Analisa:</div>
                          <div className="text-slate-700">{r.analysis!.analisaText}</div>
                        </div>
                      )}
                      {r.analysis!.pdsaPlan && (
                        <div>
                          <div className="font-bold text-emerald-700">PLAN:</div>
                          <div className="text-slate-700">{r.analysis!.pdsaPlan}</div>
                        </div>
                      )}
                      {r.analysis!.pdsaDo && (
                        <div>
                          <div className="font-bold text-blue-700">DO:</div>
                          <div className="text-slate-700">{r.analysis!.pdsaDo}</div>
                        </div>
                      )}
                      {r.analysis!.pdsaStudy && (
                        <div>
                          <div className="font-bold text-purple-700">STUDY:</div>
                          <div className="text-slate-700">{r.analysis!.pdsaStudy}</div>
                        </div>
                      )}
                      {r.analysis!.pdsaAct && (
                        <div>
                          <div className="font-bold text-orange-700">ACT:</div>
                          <div className="text-slate-700">{r.analysis!.pdsaAct}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </section>
        )}

        {/* Tanda tangan */}
        <section className="mt-10 grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <div className="text-slate-700">Dibuat oleh,</div>
            <div className="text-slate-700">PIC Unit</div>
            <div className="mt-12 border-t border-slate-400 pt-1">(...........................)</div>
          </div>
          <div>
            <div className="text-slate-700">Divalidasi oleh,</div>
            <div className="text-slate-700">Kepala Ruangan</div>
            <div className="mt-12 border-t border-slate-400 pt-1">(...........................)</div>
          </div>
          <div>
            <div className="text-slate-700">Disahkan oleh,</div>
            <div className="text-slate-700">Komite Mutu RS</div>
            <div className="mt-12 border-t border-slate-400 pt-1">(...........................)</div>
          </div>
        </section>

        <div className="mt-6 text-center text-[10px] text-slate-400">
          Dokumen ini di-generate oleh Sistem INM RS Royal Prima Jambi pada {generatedAt} ·
          Halaman 1
        </div>
      </div>
    </div>
  );
}
