"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  BadgeCheck,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { monthLabel } from "@/lib/utils";
import {
  submitAnalysis,
  approveAnalysis,
  rejectAnalysis,
  validateAnalysis,
  returnAnalysis,
} from "./actions";

export type AnalisaRow = {
  id: string;
  indicatorId: string;
  indicatorCode: string;
  indicatorTitle: string;
  unitCode: string;
  unitName: string;
  numerator: number;
  denominator: number;
  pct: number;
  target: number;
  isInverse: boolean;
  achieved: boolean;
  status: "DRAFT" | "SUBMITTED" | "VALIDATED" | "APPROVED" | "REJECTED";
  submittedAt: string | null;
  validatedAt: string | null;
  validatedByName: string | null;
  validationNote: string;
  approvedAt: string | null;
  approvedByName: string | null;
  rejectionNote: string;
  dataCollector: string;
  picName: string;
  analisaText: string;
  pdsaPlan: string;
  pdsaDo: string;
  pdsaStudy: string;
  pdsaAct: string;
};

type Props = {
  rows: AnalisaRow[];
  emptyIndicators: { id: string; code: string; title: string; unitCode: string; unitName: string }[];
  units: { code: string; name: string }[];
  year: number;
  month: number;
  statusFilter?: "DRAFT" | "SUBMITTED" | "VALIDATED" | "APPROVED" | "REJECTED";
  selectedUnitCode?: string;
  isAllUnits: boolean;
  canApprove: boolean;
  canValidate: boolean;
  currentRole: string;
  basePath: string;
  inputBasePath: string;
  categoryLabel: string;
};

const STATUS_STYLE: Record<AnalisaRow["status"], { label: string; cls: string; icon: typeof Clock }> = {
  DRAFT: { label: "Draft", cls: "bg-slate-100 text-slate-700", icon: FileText },
  SUBMITTED: { label: "Menunggu Validasi", cls: "bg-amber-100 text-amber-800", icon: Clock },
  VALIDATED: { label: "Tervalidasi", cls: "bg-sky-100 text-sky-800", icon: BadgeCheck },
  APPROVED: { label: "Disetujui", cls: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  REJECTED: { label: "Ditolak", cls: "bg-red-100 text-red-800", icon: XCircle },
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEAR_OPTIONS = (() => {
  const now = new Date();
  const years: number[] = [];
  for (let y = now.getFullYear(); y >= 2024; y--) years.push(y);
  return years;
})();

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Semua Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Menunggu Validasi" },
  { value: "VALIDATED", label: "Tervalidasi" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "REJECTED", label: "Ditolak" },
];

export function AnalisaListClient({
  rows,
  emptyIndicators,
  units,
  year,
  month,
  statusFilter,
  selectedUnitCode,
  isAllUnits,
  canApprove,
  canValidate,
  currentRole,
  basePath,
  inputBasePath,
  categoryLabel,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [returningId, setReturningId] = useState<string | null>(null);
  const [returnNote, setReturnNote] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key);
    else next.set(key, value);
    router.push(`${basePath}?${next.toString()}`);
  }

  function run(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    onDone?: () => void
  ) {
    setActionError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok && res.error) setActionError(res.error);
      else onDone?.();
    });
  }

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Analisa Bulanan {categoryLabel} & PDSA
        </h2>
        <p className="text-sm text-slate-500">
          Submit analisa → Kepala Ruangan memvalidasi → Komite Mutu menyetujui.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Bulan</label>
            <select
              value={month}
              onChange={(e) => updateParam("month", e.target.value)}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
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
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
            <select
              value={statusFilter ?? ""}
              onChange={(e) => updateParam("status", e.target.value)}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {isAllUnits && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Unit</label>
              <select
                value={selectedUnitCode ?? ""}
                onChange={(e) => updateParam("unit", e.target.value)}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              >
                <option value="">Semua Unit</option>
                {units.map((u) => (
                  <option key={u.code} value={u.code}>{u.code} · {u.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Error banner */}
      {actionError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          ⚠ {actionError}
        </div>
      )}

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryPill label="Draft" count={rows.filter((r) => r.status === "DRAFT").length} tone="slate" />
        <SummaryPill label="Menunggu Validasi" count={rows.filter((r) => r.status === "SUBMITTED").length} tone="amber" />
        <SummaryPill label="Tervalidasi" count={rows.filter((r) => r.status === "VALIDATED").length} tone="sky" />
        <SummaryPill label="Disetujui" count={rows.filter((r) => r.status === "APPROVED").length} tone="emerald" />
        <SummaryPill label="Ditolak" count={rows.filter((r) => r.status === "REJECTED").length} tone="red" />
      </div>

      {/* List */}
      <div className="space-y-2">
        {rows.length === 0 && emptyIndicators.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
            Tidak ada analisa pada filter ini.
          </div>
        )}

        {rows.map((r) => {
          const expanded = expandedId === r.id;
          const st = STATUS_STYLE[r.status];
          const StatusIcon = st.icon;
          const canSubmit = currentRole !== "DATA_COLLECTOR" && currentRole !== "DIREKTUR";
          return (
            <div
              key={r.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : r.id)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-slate-50"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                      {r.indicatorCode}
                    </span>
                    <span className="inline-flex rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                      {r.unitCode}
                    </span>
                    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium", st.cls)}>
                      <StatusIcon className="h-3 w-3" />
                      {st.label}
                    </span>
                    {r.validatedByName && (
                      <span
                        className="inline-flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-sky-200"
                        title={`Tervalidasi oleh ${r.validatedByName}${r.validatedAt ? ` pada ${new Date(r.validatedAt).toLocaleString("id-ID")}` : ""}`}
                      >
                        <BadgeCheck className="h-3 w-3" />
                        Tervalidasi
                      </span>
                    )}
                    {r.status === "REJECTED" && (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="h-3 w-3" /> Lihat alasan
                      </span>
                    )}
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-slate-900">
                    {r.indicatorTitle}
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "text-lg font-bold tabular-nums",
                    r.denominator === 0 ? "text-slate-400" : r.achieved ? "text-emerald-600" : "text-amber-600"
                  )}>
                    {r.denominator > 0 ? `${r.pct.toFixed(1)}%` : "—"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {r.numerator}/{r.denominator} · Target {r.isInverse ? "≤ 0%" : `≥ ${r.target}%`}
                  </div>
                </div>
              </button>

              {expanded && (
                <div className="border-t border-slate-200 bg-slate-50/50 p-4">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="space-y-2">
                      <DetailBlock title="ANALISA" body={r.analisaText || "—"} />
                      <DetailBlock title="PLAN — Rencana" body={r.pdsaPlan || "—"} />
                      <DetailBlock title="DO — Pelaksanaan" body={r.pdsaDo || "—"} />
                    </div>
                    <div className="space-y-2">
                      <DetailBlock title="STUDY — Evaluasi" body={r.pdsaStudy || "—"} />
                      <DetailBlock title="ACT — Tindak Lanjut" body={r.pdsaAct || "—"} />
                      <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="text-slate-500">Data Collector</div>
                            <div className="font-semibold text-slate-900">{r.dataCollector || "—"}</div>
                          </div>
                          <div>
                            <div className="text-slate-500">PIC</div>
                            <div className="font-semibold text-slate-900">{r.picName || "—"}</div>
                          </div>
                          {r.validatedAt && (
                            <div className="col-span-2 rounded-md bg-sky-50 px-2 py-1.5 ring-1 ring-sky-100">
                              <div className="flex items-center gap-1 text-sky-700">
                                <BadgeCheck className="h-3 w-3" />
                                <span className="text-slate-500">Divalidasi oleh</span>
                              </div>
                              <div className="mt-0.5 font-semibold text-slate-900">
                                {r.validatedByName ?? "—"} · {new Date(r.validatedAt).toLocaleString("id-ID")}
                              </div>
                              {r.validationNote && (
                                <div className="mt-1 text-[11px] italic text-slate-600">
                                  “{r.validationNote}”
                                </div>
                              )}
                            </div>
                          )}
                          {r.approvedAt && (
                            <div className="col-span-2">
                              <div className="text-slate-500">
                                {r.status === "APPROVED" ? "Disetujui oleh" : "Ditolak oleh"}
                              </div>
                              <div className="font-semibold text-slate-900">
                                {r.approvedByName ?? "—"} · {new Date(r.approvedAt).toLocaleString("id-ID")}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {r.status === "REJECTED" && r.rejectionNote && (
                    <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      <strong>Alasan penolakan:</strong> {r.rejectionNote}
                    </div>
                  )}

                  {(r.status === "DRAFT" || r.status === "REJECTED") && r.validationNote && !r.validatedAt && (
                    <div className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                      <strong className="inline-flex items-center gap-1">
                        <Undo2 className="h-3 w-3" /> Catatan dari Validator:
                      </strong>{" "}
                      {r.validationNote}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      href={`${inputBasePath}?indicator=${r.indicatorId}`}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Edit di Input Harian
                    </Link>

                    {canSubmit && (r.status === "DRAFT" || r.status === "REJECTED") && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => submitAnalysis(r.id))}
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                      >
                        {pending ? "Memproses..." : "Submit untuk Validasi"}
                      </button>
                    )}

                    {/* VALIDATOR actions */}
                    {canValidate && r.status === "SUBMITTED" && (
                      <>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => validateAnalysis(r.id))}
                          className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                        >
                          <BadgeCheck className="h-3.5 w-3.5" />
                          {pending ? "Memproses..." : "Validasi (Kepala Ruangan)"}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            setReturningId(returningId === r.id ? null : r.id);
                            setReturnNote("");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                          Kembalikan ke PIC
                        </button>
                      </>
                    )}

                    {/* KOMITE_MUTU / ADMIN actions */}
                    {canApprove && (r.status === "SUBMITTED" || r.status === "VALIDATED") && (
                      <>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => approveAnalysis(r.id))}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {pending ? "Memproses..." : "Setujui"}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => {
                            setRejectingId(rejectingId === r.id ? null : r.id);
                            setRejectNote("");
                          }}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          Tolak
                        </button>
                      </>
                    )}

                    {r.status === "APPROVED" && (
                      <span className="text-xs text-emerald-700">
                        ✓ Analisa ini sudah disetujui. Hubungi Komite Mutu untuk perubahan.
                      </span>
                    )}
                  </div>

                  {/* Inline return form (validator → PIC) */}
                  {returningId === r.id && (
                    <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3">
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Alasan Pengembalian <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={returnNote}
                        onChange={(e) => setReturnNote(e.target.value)}
                        placeholder="Jelaskan apa yang perlu diperbaiki oleh PIC..."
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 focus:outline-none"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReturningId(null);
                            setReturnNote("");
                          }}
                          className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            run(() => returnAnalysis(r.id, returnNote), () => {
                              setReturningId(null);
                              setReturnNote("");
                            })
                          }
                          className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                          {pending ? (
                            <span className="inline-flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" /> Menyimpan
                            </span>
                          ) : (
                            "Konfirmasi Kembalikan"
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline reject form */}
                  {rejectingId === r.id && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-white p-3">
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Alasan Penolakan <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Jelaskan apa yang perlu diperbaiki..."
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingId(null);
                            setRejectNote("");
                          }}
                          className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            run(() => rejectAnalysis(r.id, rejectNote), () => {
                              setRejectingId(null);
                              setRejectNote("");
                            })
                          }
                          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          {pending ? (
                            <span className="inline-flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" /> Menyimpan
                            </span>
                          ) : (
                            "Konfirmasi Tolak"
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Indicators without analysis yet */}
        {emptyIndicators.length > 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Indikator tanpa analisa periode ini
            </div>
            <ul className="space-y-1">
              {emptyIndicators.map((i) => (
                <li key={i.id} className="flex items-center justify-between text-sm">
                  <span className="truncate text-slate-700">
                    <span className="mr-2 inline-flex rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                      {i.code}
                    </span>
                    {i.title}
                  </span>
                  <Link
                    href={`${inputBasePath}?indicator=${i.id}`}
                    className="ml-3 flex-shrink-0 text-xs font-semibold text-emerald-600 hover:underline"
                  >
                    + Buat di Input Harian
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryPill({ label, count, tone }: { label: string; count: number; tone: "slate" | "amber" | "sky" | "emerald" | "red" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-800",
    sky: "bg-sky-100 text-sky-800",
    emerald: "bg-emerald-100 text-emerald-800",
    red: "bg-red-100 text-red-800",
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-xs font-bold", tones[tone])}>
          {count}
        </span>
      </div>
    </div>
  );
}

function DetailBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="text-sm text-slate-800 whitespace-pre-wrap">{body}</div>
    </div>
  );
}
