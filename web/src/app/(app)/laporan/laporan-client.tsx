"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  Eye,
  Loader2,
  CheckCircle2,
  XCircle,
  BadgeCheck,
  FileText,
  Clock,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { monthLabel } from "@/lib/utils";

export type LaporanRow = {
  id: string;
  indicatorId: string;
  indicatorCode: string;
  indicatorTitle: string;
  category: "INM" | "IMP" | "IMP_RS" | "IMK";
  unitCode: string;
  unitName: string;
  numerator: number;
  denominator: number;
  pct: number;
  target: number;
  isInverse: boolean;
  achieved: boolean;
  status: "DRAFT" | "SUBMITTED" | "VALIDATED" | "APPROVED" | "REJECTED";
  validatedByName: string | null;
  validatedAt: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  hasAnalysis: boolean;
  analisaText: string;
  pdsaPlan: string;
  pdsaDo: string;
  pdsaStudy: string;
  pdsaAct: string;
};

type Props = {
  rows: LaporanRow[];
  units: { code: string; name: string }[];
  year: number;
  month: number;
  category: "INM" | "IMP" | "IMP_RS" | "IMK" | "ALL";
  statusFilter: string;
  selectedUnitCode?: string;
  isAllUnits: boolean;
  hospitalName: string;
  generatedBy: string;
  currentRole: string;
  unitName: string | null;
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEAR_OPTIONS = (() => {
  const now = new Date();
  const years: number[] = [];
  for (let y = now.getFullYear(); y >= 2024; y--) years.push(y);
  return years;
})();

const STATUS_LABEL: Record<LaporanRow["status"], string> = {
  DRAFT: "Draft",
  SUBMITTED: "Menunggu Validasi",
  VALIDATED: "Tervalidasi",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

const STATUS_STYLE: Record<LaporanRow["status"], string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-amber-100 text-amber-800",
  VALIDATED: "bg-sky-100 text-sky-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
};

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Menunggu Validasi" },
  { value: "VALIDATED", label: "Tervalidasi" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "REJECTED", label: "Ditolak" },
];

const inputCls =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none";

export function LaporanClient({
  rows,
  units,
  year,
  month,
  category,
  statusFilter,
  selectedUnitCode,
  isAllUnits,
  hospitalName,
  generatedBy,
  currentRole,
  unitName,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [downloading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    router.push(`/laporan?${next.toString()}`);
  }

  // Summary stats
  const totalIndicators = rows.length;
  const totalAchieved = rows.filter((r) => r.achieved).length;
  const totalValidated = rows.filter((r) => r.validatedByName).length;
  const totalApproved = rows.filter((r) => r.status === "APPROVED").length;
  const achievementPct = totalIndicators > 0
    ? Math.round((totalAchieved / totalIndicators) * 100)
    : 0;

  // Build query string for preview/export endpoints
  function buildQuery(format?: string) {
    const q = new URLSearchParams({
      year: String(year),
      month: String(month),
      category,
      status: statusFilter,
    });
    if (selectedUnitCode) q.set("unit", selectedUnitCode);
    if (format) q.set("format", format);
    return q.toString();
  }

  function openPreview() {
    window.open(`/laporan/preview?${buildQuery()}`, "_blank");
  }

  function downloadCsv() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/laporan/csv?${buildQuery()}`);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? "Gagal download CSV");
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `laporan-INM-${year}-${String(month).padStart(2, "0")}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal download");
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Laporan Bulanan</h2>
          <p className="text-sm text-slate-500">
            {hospitalName} · Periode {monthLabel(month)} {year}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openPreview}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Eye className="h-4 w-4" />
            Preview & Cetak PDF
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={downloading || totalIndicators === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download CSV (Excel)
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
          <Filter className="h-3.5 w-3.5" /> Filter Laporan
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Bulan</label>
            <select
              value={month}
              onChange={(e) => updateParam("month", e.target.value)}
              className={inputCls}
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Tahun</label>
            <select
              value={year}
              onChange={(e) => updateParam("year", e.target.value)}
              className={inputCls}
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Kategori</label>
            <select
              value={category}
              onChange={(e) => updateParam("category", e.target.value)}
              className={inputCls}
            >
              <option value="ALL">Semua (INM + IMP Unit + IMP RS + IMK)</option>
              <option value="INM">INM</option>
              <option value="IMP">IMP Unit</option>
              <option value="IMP_RS">IMP RS</option>
              <option value="IMK">IMK (Mutu Kontrak)</option>
            </select>
          </div>
          {isAllUnits ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Unit</label>
              <select
                value={selectedUnitCode ?? ""}
                onChange={(e) => updateParam("unit", e.target.value)}
                className={inputCls}
              >
                <option value="">Semua Unit</option>
                {units.map((u) => (
                  <option key={u.code} value={u.code}>{u.code} · {u.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Unit Anda</label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {unitName ?? "—"}
              </div>
            </div>
          )}
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => updateParam("status", s.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                  (statusFilter ?? "") === s.value
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryCard label="Total Indikator" value={totalIndicators} tone="slate" />
        <SummaryCard label="Tercapai" value={totalAchieved} tone="emerald" suffix={totalIndicators > 0 ? `· ${achievementPct}%` : ""} />
        <SummaryCard label="Tervalidasi" value={totalValidated} tone="sky" />
        <SummaryCard label="Disetujui" value={totalApproved} tone="indigo" />
        <SummaryCard label="Belum Terinput" value={rows.filter((r) => !r.hasAnalysis).length} tone="amber" />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          ⚠ {error}
        </div>
      )}

      {/* Tabel laporan */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Tabel Pencapaian Indikator
            </h3>
            <div className="text-xs text-slate-500">
              Di-generate oleh <span className="font-semibold">{generatedBy}</span> · {new Date().toLocaleString("id-ID")}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">Unit / Kode</th>
                <th className="px-3 py-2.5 text-left font-semibold">Indikator</th>
                <th className="px-3 py-2.5 text-center font-semibold">Pencapaian</th>
                <th className="px-3 py-2.5 text-center font-semibold">Target</th>
                <th className="px-3 py-2.5 text-center font-semibold">Status</th>
                <th className="px-3 py-2.5 text-left font-semibold">Validator</th>
                <th className="px-3 py-2.5 text-left font-semibold">Approved By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-slate-500">
                    Tidak ada data pada filter ini.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const StatusIcon =
                  r.status === "APPROVED" ? CheckCircle2
                  : r.status === "VALIDATED" ? BadgeCheck
                  : r.status === "SUBMITTED" ? Clock
                  : r.status === "REJECTED" ? XCircle
                  : FileText;
                return (
                  <tr key={`${r.indicatorId}-${r.id}`} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <div className="text-xs font-bold text-emerald-700">{r.unitCode}</div>
                      <div className="text-[10px] text-slate-500">{r.unitName}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-slate-500">{r.indicatorCode}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-900 line-clamp-1">{r.indicatorTitle}</div>
                      <div className="text-[11px]">
                        <span className={cn(
                          "inline-flex rounded px-1 py-0.5 font-bold",
                          r.category === "INM"
                            ? "bg-emerald-50 text-emerald-700"
                            : r.category === "IMP"
                            ? "bg-sky-50 text-sky-700"
                            : r.category === "IMK"
                            ? "bg-violet-50 text-violet-700"
                            : "bg-indigo-50 text-indigo-700"
                        )}>
                          {r.category === "IMP_RS" ? "IMP RS" : r.category}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className={cn(
                        "text-base font-bold tabular-nums",
                        r.denominator === 0 ? "text-slate-400" : r.achieved ? "text-emerald-600" : "text-amber-600"
                      )}>
                        {r.denominator > 0 ? `${r.pct.toFixed(1)}%` : "—"}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {r.numerator}/{r.denominator}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-semibold tabular-nums text-slate-700">
                      {r.isInverse ? "≤ 0%" : `≥ ${r.target}%`}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold",
                        STATUS_STYLE[r.status]
                      )}>
                        <StatusIcon className="h-2.5 w-2.5" />
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {r.validatedByName ? (
                        <div>
                          <div className="font-medium text-slate-900">{r.validatedByName}</div>
                          {r.validatedAt && (
                            <div className="text-[10px] text-slate-400">
                              {new Date(r.validatedAt).toLocaleDateString("id-ID")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {r.approvedByName ? (
                        <div>
                          <div className="font-medium text-slate-900">{r.approvedByName}</div>
                          {r.approvedAt && (
                            <div className="text-[10px] text-slate-400">
                              {new Date(r.approvedAt).toLocaleDateString("id-ID")}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
            Total {rows.length} baris · Pencapaian keseluruhan {achievementPct}% ({totalAchieved}/{totalIndicators})
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  suffix,
}: {
  label: string;
  value: number;
  tone: "slate" | "emerald" | "sky" | "indigo" | "amber";
  suffix?: string;
}) {
  const tones = {
    slate: "border-slate-200 bg-white",
    emerald: "border-emerald-200 bg-emerald-50",
    sky: "border-sky-200 bg-sky-50",
    indigo: "border-indigo-200 bg-indigo-50",
    amber: "border-amber-200 bg-amber-50",
  };
  const numberColor = {
    slate: "text-slate-900",
    emerald: "text-emerald-700",
    sky: "text-sky-700",
    indigo: "text-indigo-700",
    amber: "text-amber-700",
  };
  return (
    <div className={cn("rounded-lg border px-3 py-2.5", tones[tone])}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={cn("text-xl font-bold tabular-nums", numberColor[tone])}>
          {value}
        </span>
        {suffix && <span className="text-[10px] text-slate-500">{suffix}</span>}
      </div>
    </div>
  );
}
