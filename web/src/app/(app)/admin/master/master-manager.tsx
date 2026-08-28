"use client";

import { useState, useTransition } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Copy,
  X,
  Building2,
  ListChecks,
  CalendarClock,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createUnit,
  updateUnit,
  deleteUnit,
  createIndicator,
  updateIndicator,
  deleteIndicator,
  saveInputSettings,
  copyUnitIndicators,
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
  category: "INM" | "IMP" | "IMP_RS" | "IMK";
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

type Category = "INM" | "IMP" | "IMP_RS" | "IMK";

type Tab = "indicators" | "units";

export function MasterManager({
  units,
  indicators,
  restrictEditWindow: initialRestrict,
}: {
  units: UnitRow[];
  indicators: IndicatorRow[];
  restrictEditWindow: boolean;
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

      <InputWindowSetting initial={initialRestrict} />

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
  const [copyTarget, setCopyTarget] = useState<UnitRow | null>(null);

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
                    <button
                      onClick={() => { setError(null); setCopyTarget(u); }}
                      className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-violet-600"
                      title="Salin indikator dari unit lain"
                    >
                      <Copy className="h-4 w-4" />
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

      {copyTarget && (
        <CopyIndicatorsModal
          target={copyTarget}
          units={units.filter((u) => u.id !== copyTarget.id && u.indicatorCount > 0)}
          onClose={() => setCopyTarget(null)}
        />
      )}

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

const ALL_CATEGORIES: { value: Category; label: string }[] = [
  { value: "INM", label: "INM" },
  { value: "IMP", label: "IMP Unit" },
  { value: "IMP_RS", label: "IMP RS" },
  { value: "IMK", label: "IMK" },
];

function CopyIndicatorsModal({
  target,
  units,
  onClose,
}: {
  target: UnitRow;
  units: UnitRow[];
  onClose: () => void;
}) {
  const [sourceId, setSourceId] = useState(units[0]?.id ?? "");
  const [cats, setCats] = useState<Category[]>(["INM", "IMP", "IMP_RS", "IMK"]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleCat(c: Category) {
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    if (!sourceId) {
      setError("Pilih unit sumber");
      return;
    }
    if (cats.length === 0) {
      setError("Pilih minimal satu kategori");
      return;
    }
    startTransition(async () => {
      const res = await copyUnitIndicators({
        sourceUnitId: sourceId,
        targetUnitId: target.id,
        categories: cats,
      });
      if (!res.ok) setError(res.error);
      else {
        setDone(
          res.copied > 0
            ? `${res.copied} indikator disalin ke ${target.code}${res.skipped > 0 ? `, ${res.skipped} dilewati (kode sudah ada)` : ""}`
            : "Tidak ada yang disalin — semua kode sudah ada di unit tujuan"
        );
      }
    });
  }

  return (
    <Modal title={`Salin Indikator ke ${target.code}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5">
        {units.length === 0 ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Tidak ada unit lain yang punya indikator untuk disalin.
          </p>
        ) : (
          <>
            <Field label="Unit Sumber *">
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className={inputCls}
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.code} — {u.name} ({u.indicatorCount} indikator)
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Kategori yang Disalin *">
              <div className="flex flex-wrap gap-3">
                {ALL_CATEGORIES.map((c) => (
                  <label key={c.value} className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={cats.includes(c.value)}
                      onChange={() => toggleCat(c.value)}
                      className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </Field>

            <p className="text-xs leading-relaxed text-slate-500">
              Indikator dengan kode yang sudah ada di {target.code} akan dilewati. Data
              observasi/analisa tidak ikut disalin — hanya definisi indikatornya.
            </p>
          </>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            ⚠ {error}
          </div>
        )}
        {done && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            ✓ {done}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
            Tutup
          </button>
          {units.length > 0 && (
            <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Salin
            </button>
          )}
        </div>
      </form>
    </Modal>
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
            <option value="IMK">IMK ({indicators.filter((i) => i.category === "IMK").length})</option>
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
                      : i.category === "IMK"
                      ? "bg-violet-100 text-violet-700"
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
                  <option value="IMK">IMK (Mutu Kontrak)</option>
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

// ─── PENGATURAN INPUT ───────────────────────────────────────────────────
function InputWindowSetting({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function save(next: boolean) {
    setEnabled(next);
    setMsg(null);
    startTransition(async () => {
      const res = await saveInputSettings({ restrictEditWindow: next });
      if (res.ok) {
        setMsg({ ok: true, text: next ? "Pembatas 7 hari diaktifkan" : "Mode bebas aktif — semua tanggal dapat diisi" });
      } else {
        setEnabled(!next);
        setMsg({ ok: false, text: res.error });
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-lg bg-violet-100 p-2 text-violet-600">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Pembatas Input 7 Hari</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Aktif: hanya 7 hari terakhir yang bisa diisi (tanggal lain terkunci).
              Nonaktif: semua tanggal pada bulan berjalan bisa diisi bebas.
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={pending}
          onClick={() => save(!enabled)}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
            enabled ? "bg-emerald-600" : "bg-slate-300"
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
              enabled ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </div>

      {pending && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan…
        </p>
      )}
      {msg && !pending && (
        <p
          className={cn(
            "mt-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium",
            msg.ok
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          )}
        >
          {msg.ok ? (
            <Check className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          )}
          {msg.text}
        </p>
      )}
    </div>
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
