"use client";

import { useState, useTransition } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Building2,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createUnit,
  updateUnit,
  deleteUnit,
  createIndicator,
  updateIndicator,
  deleteIndicator,
} from "./actions";

type UnitRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  orderNo: number;
  indicatorCount: number;
  userCount: number;
};

type IndicatorRow = {
  id: string;
  unitId: string;
  unitCode: string;
  unitName: string;
  category: "INM" | "IMP" | "IMP_RS";
  code: string;
  title: string;
  numeratorLabel: string;
  denominatorLabel: string;
  targetPct: number;
  orderNo: number;
  isActive: boolean;
  observationCount: number;
  analysisCount: number;
};

type Category = "INM" | "IMP" | "IMP_RS";

type Tab = "indicators" | "units";

export function MasterManager({
  units,
  indicators,
}: {
  units: UnitRow[];
  indicators: IndicatorRow[];
}) {
  const [tab, setTab] = useState<Tab>("indicators");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Master Data</h2>
        <p className="text-sm text-slate-500">
          Kelola daftar Unit dan Indikator Mutu Nasional.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
        <TabBtn active={tab === "indicators"} onClick={() => setTab("indicators")} icon={ListChecks} label={`Indikator (${indicators.length})`} />
        <TabBtn active={tab === "units"} onClick={() => setTab("units")} icon={Building2} label={`Unit (${units.length})`} />
      </div>

      {tab === "indicators" ? (
        <IndicatorsPanel units={units} indicators={indicators} />
      ) : (
        <UnitsPanel units={units} />
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors",
        active ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// ─── UNITS ──────────────────────────────────────────────────────────────
type UnitForm = {
  id?: string;
  code: string;
  name: string;
  description: string;
  orderNo: number;
};

function UnitsPanel({ units }: { units: UnitRow[] }) {
  const [form, setForm] = useState<UnitForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setError(null);
    setForm({
      code: "",
      name: "",
      description: "",
      orderNo: (units.at(-1)?.orderNo ?? 0) + 1,
    });
  }
  function openEdit(u: UnitRow) {
    setError(null);
    setForm({
      id: u.id,
      code: u.code,
      name: u.name,
      description: u.description,
      orderNo: u.orderNo,
    });
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    startTransition(async () => {
      const res = form.id
        ? await updateUnit({ id: form.id, code: form.code, name: form.name, description: form.description, orderNo: form.orderNo })
        : await createUnit(form);
      if (!res.ok) setError(res.error);
      else setForm(null);
    });
  }
  function remove(u: UnitRow) {
    if (!confirm(`Hapus unit "${u.code} - ${u.name}"?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteUnit(u.id);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" /> Tambah Unit
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          ⚠ {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Urut</th>
              <th className="px-4 py-3 text-left font-semibold">Kode</th>
              <th className="px-4 py-3 text-left font-semibold">Nama Unit</th>
              <th className="px-4 py-3 text-left font-semibold">Indikator</th>
              <th className="px-4 py-3 text-left font-semibold">User</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {units.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Belum ada unit.</td></tr>
            )}
            {units.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-xs tabular-nums text-slate-600">{u.orderNo}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                    {u.code}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{u.name}</div>
                  {u.description && (
                    <div className="text-xs text-slate-500 line-clamp-1">{u.description}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{u.indicatorCount}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{u.userCount}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(u)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-600" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(u)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" title="Hapus">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal title={form.id ? "Edit Unit" : "Tambah Unit"} onClose={() => setForm(null)}>
          <form onSubmit={submit} className="space-y-3 p-5">
            <div className="grid gap-3 sm:grid-cols-[6rem_1fr]">
              <Field label="Kode *">
                <input
                  required
                  maxLength={32}
                  pattern="[A-Z0-9_]+"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="FARMASI"
                  disabled={!!form.id}
                  className={cn(inputCls, form.id && "bg-slate-100 text-slate-500")}
                />
              </Field>
              <Field label="Nama Unit *">
                <input
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Urutan Tampil">
              <input
                type="number"
                min={0}
                max={9999}
                value={form.orderNo}
                onChange={(e) => setForm({ ...form, orderNo: Number(e.target.value) })}
                className={inputCls}
              />
            </Field>
            <Field label="Deskripsi">
              <textarea
                rows={2}
                maxLength={500}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={inputCls}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setForm(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
                Batal
              </button>
              <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

// ─── INDICATORS ─────────────────────────────────────────────────────────
type IndicatorForm = {
  id?: string;
  unitId: string;
  category: Category;
  code: string;
  title: string;
  numeratorLabel: string;
  denominatorLabel: string;
  targetPct: number;
  orderNo: number;
  isActive: boolean;
};

function IndicatorsPanel({
  units,
  indicators,
}: {
  units: UnitRow[];
  indicators: IndicatorRow[];
}) {
  const [form, setForm] = useState<IndicatorForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterUnit, setFilterUnit] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<"ALL" | Category>("ALL");
  const [pending, startTransition] = useTransition();

  const filtered = indicators.filter((i) => {
    if (filterUnit && i.unitId !== filterUnit) return false;
    if (filterCategory !== "ALL" && i.category !== filterCategory) return false;
    return true;
  });

  function openCreate() {
    setError(null);
    setForm({
      unitId: filterUnit || units[0]?.id || "",
      category: filterCategory === "ALL" ? "INM" : filterCategory,
      code: "",
      title: "",
      numeratorLabel: "",
      denominatorLabel: "",
      targetPct: 100,
      orderNo: 1,
      isActive: true,
    });
  }
  function openEdit(i: IndicatorRow) {
    setError(null);
    setForm({
      id: i.id,
      unitId: i.unitId,
      category: i.category,
      code: i.code,
      title: i.title,
      numeratorLabel: i.numeratorLabel,
      denominatorLabel: i.denominatorLabel,
      targetPct: i.targetPct,
      orderNo: i.orderNo,
      isActive: i.isActive,
    });
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    startTransition(async () => {
      const res = form.id
        ? await updateIndicator({
            id: form.id,
            unitId: form.unitId,
            category: form.category,
            code: form.code,
            title: form.title,
            numeratorLabel: form.numeratorLabel,
            denominatorLabel: form.denominatorLabel,
            targetPct: form.targetPct,
            orderNo: form.orderNo,
            isActive: form.isActive,
          })
        : await createIndicator(form);
      if (!res.ok) setError(res.error);
      else setForm(null);
    });
  }
  function remove(i: IndicatorRow) {
    if (!confirm(`Hapus indikator "${i.code} - ${i.title}"?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteIndicator(i.id);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as "ALL" | Category)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          >
            <option value="ALL">Semua Kategori ({indicators.length})</option>
            <option value="INM">INM ({indicators.filter((i) => i.category === "INM").length})</option>
            <option value="IMP">IMP Unit ({indicators.filter((i) => i.category === "IMP").length})</option>
            <option value="IMP_RS">IMP RS ({indicators.filter((i) => i.category === "IMP_RS").length})</option>
          </select>
          <select
            value={filterUnit}
            onChange={(e) => setFilterUnit(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          >
            <option value="">Semua Unit ({filterCategory === "ALL" ? indicators.length : indicators.filter((i) => i.category === filterCategory).length})</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.code} · {u.name} ({indicators.filter((i) => i.unitId === u.id && (filterCategory === "ALL" || i.category === filterCategory)).length})
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" /> Tambah Indikator
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          ⚠ {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Kode / Unit</th>
              <th className="px-4 py-3 text-left font-semibold">Judul & Variabel</th>
              <th className="px-4 py-3 text-center font-semibold">Target</th>
              <th className="px-4 py-3 text-center font-semibold">Kategori</th>
              <th className="px-4 py-3 text-center font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Tidak ada indikator.</td></tr>
            )}
            {filtered.map((i) => (
              <tr key={i.id} className={cn("hover:bg-slate-50", !i.isActive && "opacity-60")}>
                <td className="px-4 py-3">
                  <div className="font-mono text-xs font-semibold text-slate-900">{i.code}</div>
                  <div className="text-xs text-emerald-700">{i.unitCode}</div>
                  <div className="text-[11px] text-slate-400">Urut {i.orderNo}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900 line-clamp-1">{i.title}</div>
                  <div className="text-[11px] text-slate-500 line-clamp-1">
                    <span className="text-emerald-700">P:</span> {i.numeratorLabel}
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-1">
                    <span className="text-slate-700">Q:</span> {i.denominatorLabel}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-bold tabular-nums text-slate-900">
                    {i.targetPct === 0 ? "≤ 0%" : `≥ ${i.targetPct}%`}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={cn(
                    "inline-flex rounded px-1.5 py-0.5 text-[11px] font-bold",
                    i.category === "INM"
                      ? "bg-emerald-100 text-emerald-700"
                      : i.category === "IMP"
                      ? "bg-sky-100 text-sky-700"
                      : "bg-indigo-100 text-indigo-700"
                  )}>
                    {i.category === "IMP_RS" ? "IMP RS" : i.category}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {i.isActive ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Nonaktif
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(i)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-600" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(i)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" title="Hapus">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal title={form.id ? "Edit Indikator" : "Tambah Indikator"} onClose={() => setForm(null)} wide>
          <form onSubmit={submit} className="space-y-3 p-5">
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem_8rem]">
              <Field label="Unit *">
                <select
                  required
                  value={form.unitId}
                  onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                  className={inputCls}
                >
                  <option value="">— Pilih Unit —</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>{u.code} · {u.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Kategori *">
                <select
                  required
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                  disabled={!!form.id}
                  className={cn(inputCls, form.id && "bg-slate-100 text-slate-500")}
                >
                  <option value="INM">INM</option>
                  <option value="IMP">IMP Unit</option>
                  <option value="IMP_RS">IMP RS</option>
                </select>
              </Field>
              <Field label="Urutan">
                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={form.orderNo}
                  onChange={(e) => setForm({ ...form, orderNo: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <Field label="Kode *">
                <input
                  required
                  maxLength={64}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="FARMASI-01"
                  disabled={!!form.id}
                  className={cn(inputCls, form.id && "bg-slate-100 text-slate-500")}
                />
              </Field>
              <Field label="Judul Indikator *">
                <input
                  required
                  maxLength={255}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Label Pembilang *">
              <textarea
                required
                rows={2}
                maxLength={500}
                value={form.numeratorLabel}
                onChange={(e) => setForm({ ...form, numeratorLabel: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Label Penyebut *">
              <textarea
                required
                rows={2}
                maxLength={500}
                value={form.denominatorLabel}
                onChange={(e) => setForm({ ...form, denominatorLabel: e.target.value })}
                className={inputCls}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Target (% — isi 0 untuk indikator 'lower is better' seperti Penundaan Operasi)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.targetPct}
                  onChange={(e) => setForm({ ...form, targetPct: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <label className="flex items-end pb-2">
                <span className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Indikator aktif</span>
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setForm(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
                Batal
              </button>
              <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

// ─── shared bits ────────────────────────────────────────────────────────
const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className={cn("max-h-[90vh] w-full overflow-auto rounded-xl bg-white shadow-xl", wide ? "max-w-3xl" : "max-w-lg")}>
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
