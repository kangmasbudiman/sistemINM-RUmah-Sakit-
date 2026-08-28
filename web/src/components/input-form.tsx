"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { saveIndicatorData, type SaveResult } from "@/app/(app)/input/actions";
import { monthLabel } from "@/lib/utils";
import { EDIT_WINDOW_DAYS, isDayEditable } from "@/lib/date-window";
import { DailyTrendChart } from "@/components/dashboard/charts";

type Indicator = {
  id: string;
  code: string;
  title: string;
  numeratorLabel: string;
  denominatorLabel: string;
  targetPct: number;
  unit: { code: string; name: string };
  observations: {
    observationDate: string;
    numeratorValue: number;
    denominatorValue: number;
  }[];
  analysis: {
    id: string;
    analisaText: string;
    pdsaPlan: string;
    pdsaDo: string;
    pdsaStudy: string;
    pdsaAct: string;
    dataCollector: string;
    picName: string;
    picNik: string;
    status: string;
    rejectionNote: string;
  } | null;
};

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function obsMap(ind: Indicator): Record<string, { n: number; d: number }> {
  const m: Record<string, { n: number; d: number }> = {};
  for (const o of ind.observations) {
    m[o.observationDate.slice(0, 10)] = {
      n: o.numeratorValue,
      d: o.denominatorValue,
    };
  }
  return m;
}

type AnalysisDraft = {
  analisaText: string;
  pdsaPlan: string;
  pdsaDo: string;
  pdsaStudy: string;
  pdsaAct: string;
  dataCollector: string;
  picName: string;
  picNik: string;
};

const PDSA_FIELDS: { key: keyof AnalysisDraft; label: string }[] = [
  { key: "pdsaPlan", label: "PLAN — Rencana" },
  { key: "pdsaDo", label: "DO — Pelaksanaan" },
  { key: "pdsaStudy", label: "STUDY — Evaluasi" },
  { key: "pdsaAct", label: "ACT — Tindak Lanjut" },
];

export function InputForm({
  indicators,
  selectedId,
  year,
  month,
  today,
  restrictWindow = true,
  currentUserName,
  currentUserNik,
  inputBasePath = "/input",
}: {
  indicators: Indicator[];
  selectedId: string;
  year: number;
  month: number;
  today: string;
  restrictWindow?: boolean;
  currentUserName?: string | null;
  currentUserNik?: string | null;
  inputBasePath?: string;
}) {
  const router = useRouter();
  const current =
    indicators.find((i) => i.id === selectedId) ?? indicators[0];

  const [indicatorId, setIndicatorId] = useState(current.id);
  const [draft, setDraft] = useState<Record<string, { n: string; d: string }>>(
    {}
  );
  const [analysisDraft, setAnalysisDraft] = useState<AnalysisDraft>({
    analisaText: current.analysis?.analisaText ?? "",
    pdsaPlan: current.analysis?.pdsaPlan ?? "",
    pdsaDo: current.analysis?.pdsaDo ?? "",
    pdsaStudy: current.analysis?.pdsaStudy ?? "",
    pdsaAct: current.analysis?.pdsaAct ?? "",
    dataCollector: current.analysis?.dataCollector || currentUserName || "",
    picName: current.analysis?.picName || currentUserName || "",
    picNik: current.analysis?.picNik || currentUserNik || "",
  });
  const [result, setResult] = useState<SaveResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [manualEdit, setManualEdit] = useState(false);

  const totalDays = daysInMonth(year, month);

  // Sync from URL change (browser back/forward) or dropdown change
  useEffect(() => {
    setIndicatorId(selectedId);
  }, [selectedId]);

  // When indicator changes, reset draft + analysis fields from the indicator's stored analysis
  useEffect(() => {
    const c = indicators.find((i) => i.id === indicatorId);
    if (!c) return;
    setDraft({});
    setResult(null);
    setAnalysisDraft({
      analisaText: c.analysis?.analisaText ?? "",
      pdsaPlan: c.analysis?.pdsaPlan ?? "",
      pdsaDo: c.analysis?.pdsaDo ?? "",
      pdsaStudy: c.analysis?.pdsaStudy ?? "",
      pdsaAct: c.analysis?.pdsaAct ?? "",
      dataCollector: c.analysis?.dataCollector || currentUserName || "",
      picName: c.analysis?.picName || currentUserName || "",
      picNik: c.analysis?.picNik || currentUserNik || "",
    });
  }, [indicatorId, indicators, currentUserName, currentUserNik]);

  const existingObs = obsMap(current);

  function getVal(dateKey: string, field: "n" | "d"): string {
    const d = draft[dateKey];
    if (d && d[field] !== undefined) return d[field];
    if (existingObs[dateKey]) return String(existingObs[dateKey][field]);
    return "";
  }

  function changeCell(dateKey: string, field: "n" | "d", value: string) {
    setDraft((prev) => ({
      ...prev,
      [dateKey]: { ...(prev[dateKey] ?? { n: "", d: "" }), [field]: value },
    }));
  }

  function changeAnalysis(field: keyof AnalysisDraft, value: string) {
    setAnalysisDraft((prev) => ({ ...prev, [field]: value }));
  }

  // Aggregate Σ pembilang, Σ penyebut, %
  let sumN = 0;
  let sumD = 0;
  // Tren harian untuk chart
  const trendData = [];
  for (let day = 1; day <= totalDays; day++) {
    const dateKey = `${year}-${pad(month)}-${pad(day)}`;
    const n = Number(getVal(dateKey, "n") || "0");
    const d = Number(getVal(dateKey, "d") || "0");
    if (Number.isFinite(n)) sumN += n;
    if (Number.isFinite(d)) sumD += d;
    trendData.push({
      day,
      num: Number.isFinite(n) ? n : 0,
      den: Number.isFinite(d) ? d : 0,
      pct: Number.isFinite(d) && d > 0 ? (n / d) * 100 : 0,
    });
  }
  const pct = sumD > 0 ? (sumN / sumD) * 100 : 0;
  const meetsTarget = pct >= current.targetPct;

  function onSave() {
    setResult(null);
    startTransition(async () => {
      const rows = [];
      for (let day = 1; day <= totalDays; day++) {
        if (!dayEditable(day)) continue;
        const dateKey = `${year}-${pad(month)}-${pad(day)}`;
        const ex = existingObs[dateKey];
        const dv = draft[dateKey];

        if (!dv && !ex) continue;

        const nStr = dv?.n ?? (ex ? String(ex.n) : "0");
        const dStr = dv?.d ?? (ex ? String(ex.d) : "0");
        const nNum = Number.isFinite(Number(nStr)) ? Number(nStr) : 0;
        const dNum = Number.isFinite(Number(dStr)) ? Number(dStr) : 0;

        if (nNum === 0 && dNum === 0 && !ex) continue;

        rows.push({
          date: dateKey,
          numerator: nNum,
          denominator: dNum,
        });
      }

      const res = await saveIndicatorData({
        indicatorId,
        periodMonth: month,
        periodYear: year,
        rows,
        analysis: analysisDraft,
      });
      setResult(res);
      if (res.ok) {
        setDraft({});
        router.refresh();
      }
    });
  }

  const isLocked = current.analysis?.status === "APPROVED";
  const isRejected = current.analysis?.status === "REJECTED";

  function dayEditable(day: number): boolean {
    if (!restrictWindow) return true;
    return isDayEditable(year, month, day, today);
  }

  const requiredFields: { key: keyof AnalysisDraft; label: string }[] = [
    { key: "analisaText", label: "Analisa" },
    { key: "pdsaPlan", label: "Plan" },
    { key: "pdsaDo", label: "Do" },
    { key: "pdsaStudy", label: "Study" },
    { key: "pdsaAct", label: "Act" },
    { key: "dataCollector", label: "Data Collector" },
    { key: "picName", label: "Nama PIC" },
    { key: "picNik", label: "NIK PIC" },
  ];
  const missingFields = requiredFields.filter(
    (f) => !analysisDraft[f.key].trim()
  );
  const analysisComplete = missingFields.length === 0;
  const canSave = !isLocked && !pending;

  return (
    <div className="space-y-4">
      {/* Header: selector + period + status */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <label
              htmlFor="indicator"
              className="block text-xs font-medium text-slate-500"
            >
              Pilih Indikator
            </label>
            <select
              id="indicator"
              value={indicatorId}
              onChange={(e) => {
                setIndicatorId(e.target.value);
                router.push(`${inputBasePath}?indicator=${e.target.value}`);
              }}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            >
              {indicators.map((i) => (
                <option key={i.id} value={i.id}>
                  [{i.unit.code}] {i.code} · {i.title}
                </option>
              ))}
            </select>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-slate-500">Periode</div>
            <div className="text-sm font-semibold text-slate-900">
              {monthLabel(month)} {year}
            </div>
          </div>
        </div>

        {isLocked && (
          <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            ✓ Analisa sudah di-approve. Hubungi Komite Mutu untuk mengubah.
          </div>
        )}
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {restrictWindow ? (
            <>
              ℹ Hanya {EDIT_WINDOW_DAYS} hari terakhir (termasuk hari ini) yang
              dapat diisi. Hari di luarnya bersifat read-only.
            </>
          ) : (
            <>
              ℹ Mode bebas: semua tanggal bulan ini dapat diisi (pembatas 7 hari
              dinonaktifkan oleh admin).
            </>
          )}
        </div>
        {isRejected && current.analysis?.rejectionNote && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            ✗ Ditolak: {current.analysis.rejectionNote}
          </div>
        )}
      </div>

      {/* Daily trend chart — live update as user types */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Tren Pencapaian Harian
            </h3>
            <p className="text-xs text-slate-500">
              {current.code} · {monthLabel(month)} {year} · Target{" "}
              <span className="font-semibold text-amber-600">
                {current.targetPct.toFixed(0)}%
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="rounded-lg bg-slate-50 px-3 py-1.5 text-center">
              <div className="text-[10px] text-slate-500">Σ Pembilang</div>
              <div className="font-bold text-slate-900">{sumN}</div>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-1.5 text-center">
              <div className="text-[10px] text-slate-500">Σ Penyebut</div>
              <div className="font-bold text-slate-900">{sumD}</div>
            </div>
            <div
              className={`rounded-lg px-3 py-1.5 text-center ${
                meetsTarget
                  ? "bg-emerald-50"
                  : "bg-amber-50"
              }`}
            >
              <div
                className={`text-[10px] ${
                  meetsTarget ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                Pencapaian
              </div>
              <div
                className={`font-bold ${
                  meetsTarget ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {pct.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
        <DailyTrendChart data={trendData} target={current.targetPct} />
      </div>

      {/* Spreadsheet — 3 sections: left fixed | dates scrollable | right fixed */}
      <div className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex w-full min-w-0">
          {/* LEFT — fixed: No, Judul, Variabel */}
          <div className="grid shrink-0 grid-cols-[3rem_300px_11rem] grid-rows-[2.5rem_minmax(4.5rem,auto)_minmax(4.5rem,auto)]">
            {/* Header row */}
            <div className="flex items-center justify-center border-b border-r border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
              No
            </div>
            <div className="flex items-center border-b border-r border-slate-200 bg-slate-50 px-3 text-xs font-bold uppercase tracking-wide text-slate-600">
              Judul Indikator
            </div>
            <div className="flex items-center border-b border-slate-200 bg-slate-50 px-3 text-xs font-bold uppercase tracking-wide text-slate-600">
              Variabel
            </div>
            {/* Pembilang row */}
            <div className="flex items-center justify-center border-b border-r border-slate-200 text-base font-bold text-slate-700">
              1
            </div>
            <div className="overflow-hidden border-b border-r border-slate-200 px-3 py-2">
              <div className="line-clamp-3 text-sm font-bold leading-tight text-slate-900">
                {current.title}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                [{current.unit.code}] · Target{" "}
                <span className="font-semibold text-slate-700">
                  {current.targetPct.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="flex items-center border-b border-slate-200 bg-emerald-50 px-3 py-2 text-sm font-semibold leading-snug text-emerald-900">
              {current.numeratorLabel}
            </div>
            {/* Penyebut row */}
            <div className="border-r border-slate-200" />
            <div className="border-r border-slate-200" />
            <div className="flex items-center bg-slate-100 px-3 py-2 text-sm font-semibold leading-snug text-slate-800">
              {current.denominatorLabel}
            </div>
          </div>

          {/* MIDDLE — scrollable dates only */}
          <div className="scrollbar-thin min-w-0 flex-1 overflow-x-auto border-r border-slate-200">
            <div
              className="grid grid-rows-[2.5rem_minmax(4.5rem,auto)_minmax(4.5rem,auto)]"
              style={{
                gridTemplateColumns: `repeat(${totalDays}, 3rem)`,
              }}
            >
              {/* Header: day numbers */}
              {Array.from({ length: totalDays }, (_, i) => i + 1).map(
                (day) => {
                  const editable = dayEditable(day);
                  const isToday = `${year}-${pad(month)}-${pad(day)}` === today;
                  return (
                    <div
                      key={`h-${day}`}
                      className={`flex items-center justify-center border-b border-r text-sm font-bold tabular-nums ${
                        isToday
                          ? "border-x-2 border-t-2 border-emerald-500 bg-emerald-100 text-emerald-800"
                          : editable
                            ? "border-slate-200 bg-emerald-50/60 text-emerald-800"
                            : "border-slate-200 bg-slate-100 text-slate-400"
                      }`}
                      title={
                        isToday
                          ? "Hari ini"
                          : editable
                            ? "Dapat diisi"
                            : "Di luar jendela 7 hari"
                      }
                    >
                      {day}
                    </div>
                  );
                }
              )}
              {/* Pembilang inputs */}
              {Array.from({ length: totalDays }, (_, i) => i + 1).map(
                (day) => {
                  const dateKey = `${year}-${pad(month)}-${pad(day)}`;
                  const editable = dayEditable(day);
                  return (
                    <div
                      key={`n-${day}`}
                      className="border-b border-r border-slate-200"
                    >
                      <input
                        type="number"
                        min={0}
                        disabled={isLocked || !editable}
                        value={getVal(dateKey, "n")}
                        onChange={(e) =>
                          changeCell(dateKey, "n", e.target.value)
                        }
                        className="spreadsheet-input h-full w-full bg-transparent text-center text-sm font-semibold tabular-nums text-slate-900 focus:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  );
                }
              )}
              {/* Penyebut inputs */}
              {Array.from({ length: totalDays }, (_, i) => i + 1).map(
                (day) => {
                  const dateKey = `${year}-${pad(month)}-${pad(day)}`;
                  const editable = dayEditable(day);
                  return (
                    <div
                      key={`d-${day}`}
                      className="border-r border-slate-200 bg-slate-50/40"
                    >
                      <input
                        type="number"
                        min={0}
                        disabled={isLocked || !editable}
                        value={getVal(dateKey, "d")}
                        onChange={(e) =>
                          changeCell(dateKey, "d", e.target.value)
                        }
                        className="spreadsheet-input h-full w-full bg-transparent text-center text-sm font-semibold tabular-nums text-slate-900 focus:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-500 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* RIGHT — fixed: Σ and % */}
          <div className="grid shrink-0 grid-cols-[4rem_5rem] grid-rows-[2.5rem_minmax(4.5rem,auto)_minmax(4.5rem,auto)]">
            {/* Header */}
            <div className="flex items-center justify-center border-b border-r border-slate-200 bg-emerald-50 text-xs font-bold uppercase text-emerald-700">
              Σ
            </div>
            <div className="flex items-center justify-center border-b border-slate-200 bg-emerald-100 text-xs font-bold uppercase text-emerald-800">
              %
            </div>
            {/* Σ pembilang */}
            <div className="flex items-center justify-end border-b border-r border-slate-200 bg-emerald-50 px-2 text-base font-bold tabular-nums text-emerald-900">
              {sumN}
            </div>
            {/* % cell — spans 2 rows */}
            <div
              className={`row-span-2 flex items-center justify-center px-2 text-center text-base font-bold tabular-nums ${
                sumD > 0
                  ? meetsTarget
                    ? "bg-emerald-500 text-white"
                    : "bg-amber-400 text-amber-950"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {sumD > 0 ? `${pct.toFixed(1)}%` : "—"}
            </div>
            {/* Σ penyebut */}
            <div className="flex items-center justify-end border-r border-slate-200 bg-slate-100 px-2 text-base font-bold tabular-nums text-slate-900">
              {sumD}
            </div>
          </div>
        </div>
      </div>

      {/* Analisa + PDSA + PIC */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
            Analisa & Rencana Tindak Lanjut
          </h3>
          <div className="flex items-center gap-3">
            {!analysisComplete && !isLocked && (
              <span className="hidden text-xs font-medium text-amber-600 sm:inline">
                {missingFields.length} field belum diisi
              </span>
            )}
            <button
              onClick={onSave}
              disabled={!canSave}
              title={
                isLocked
                  ? "Analisa sudah di-approve"
                  : "Simpan data harian & analisa (draft)"
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Simpan
                </>
              )}
            </button>
          </div>
        </div>

        {!analysisComplete && !isLocked && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            ⚠ Data harian bisa disimpan sebagai draft. Namun analisa wajib
            lengkap sebelum submit ke Komite Mutu — belum terisi:{" "}
            <span className="font-semibold">
              {missingFields.map((f) => f.label).join(", ")}
            </span>
          </div>
        )}

        {/* ANALISA */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            ANALISA <span className="text-red-500">*</span>
          </label>
          <textarea
            disabled={isLocked}
            value={analysisDraft.analisaText}
            onChange={(e) => changeAnalysis("analisaText", e.target.value)}
            rows={3}
            placeholder="Analisa pencapaian indikator bulan ini..."
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none disabled:bg-slate-50 ${
              !analysisDraft.analisaText.trim() && !isLocked
                ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500/20"
                : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20"
            }`}
          />
        </div>

        {/* PDSA 2x2 grid */}
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            PDSA <span className="text-red-500">*</span>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {PDSA_FIELDS.map(({ key, label }) => {
              const empty = !analysisDraft[key].trim();
              return (
                <div key={key}>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {label} <span className="text-red-500">*</span>
                  </div>
                  <textarea
                    disabled={isLocked}
                    value={analysisDraft[key]}
                    onChange={(e) => changeAnalysis(key, e.target.value)}
                    rows={3}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none disabled:bg-slate-50 ${
                      empty && !isLocked
                        ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500/20"
                        : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Data collector + PIC — auto-filled from logged-in user, toggle to edit */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-700">
              Data Collector &amp; PIC
            </div>
            {!isLocked && (
              <button
                type="button"
                onClick={() => setManualEdit((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                  manualEdit
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {manualEdit ? "Mode manual aktif" : "Edit manual"}
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Data Collector <span className="text-red-500">*</span>
                <span
                  className={`ml-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                    manualEdit
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {manualEdit ? "Manual" : "Otomatis"}
                </span>
              </label>
              <input
                type="text"
                readOnly={!manualEdit || isLocked}
                disabled={isLocked}
                value={analysisDraft.dataCollector}
                onChange={(e) =>
                  changeAnalysis("dataCollector", e.target.value)
                }
                tabIndex={manualEdit ? 0 : -1}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none disabled:bg-slate-50 ${
                  manualEdit && !isLocked
                    ? !analysisDraft.dataCollector.trim()
                      ? "border-amber-400 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                      : "border-slate-300 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    : "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-700"
                }`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Nama PIC <span className="text-red-500">*</span>
                <span
                  className={`ml-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                    manualEdit
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {manualEdit ? "Manual" : "Otomatis"}
                </span>
              </label>
              <input
                type="text"
                readOnly={!manualEdit || isLocked}
                disabled={isLocked}
                value={analysisDraft.picName}
                onChange={(e) => changeAnalysis("picName", e.target.value)}
                tabIndex={manualEdit ? 0 : -1}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none disabled:bg-slate-50 ${
                  manualEdit && !isLocked
                    ? !analysisDraft.picName.trim()
                      ? "border-amber-400 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                      : "border-slate-300 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    : "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-700"
                }`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                NIK PIC <span className="text-red-500">*</span>
                <span
                  className={`ml-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                    manualEdit
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {manualEdit ? "Manual" : "Otomatis"}
                </span>
              </label>
              <input
                type="text"
                maxLength={32}
                readOnly={!manualEdit || isLocked}
                disabled={isLocked}
                value={analysisDraft.picNik}
                onChange={(e) => changeAnalysis("picNik", e.target.value)}
                tabIndex={manualEdit ? 0 : -1}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none disabled:bg-slate-50 ${
                  manualEdit && !isLocked
                    ? !analysisDraft.picNik.trim()
                      ? "border-amber-400 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                      : "border-slate-300 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    : "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-700"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Result banner */}
        {result && (
          <div
            className={
              result.ok
                ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700"
                : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            }
          >
            {result.ok
              ? `✓ Berhasil menyimpan ${result.saved} baris.`
              : `✗ ${result.error}`}
          </div>
        )}
      </div>
    </div>
  );
}
