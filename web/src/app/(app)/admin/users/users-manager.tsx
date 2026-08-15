"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Plus, Pencil, Trash2, X, Search, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { createUser, updateUser, deleteUser } from "./actions";

type Role = "ADMIN" | "KOMITE_MUTU" | "DIREKTUR" | "PIC_UNIT" | "DATA_COLLECTOR" | "VALIDATOR";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  nik: string;
  gelar: string;
  unitId: string;
  unitCode: string | null;
  unitName: string | null;
  isActive: boolean;
  createdAt: string;
};

type UnitOpt = { id: string; code: string; name: string; orderNo: number };

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  KOMITE_MUTU: "Komite Mutu",
  DIREKTUR: "Direktur",
  PIC_UNIT: "PIC Unit",
  DATA_COLLECTOR: "Data Collector",
  VALIDATOR: "Validator (Kepala Ruangan)",
};

const ROLE_STYLE: Record<Role, string> = {
  ADMIN: "bg-purple-100 text-purple-800",
  KOMITE_MUTU: "bg-emerald-100 text-emerald-800",
  DIREKTUR: "bg-sky-100 text-sky-800",
  PIC_UNIT: "bg-amber-100 text-amber-800",
  DATA_COLLECTOR: "bg-slate-100 text-slate-700",
  VALIDATOR: "bg-indigo-100 text-indigo-800",
};

const ALL_UNITS_ROLES: Role[] = ["ADMIN", "KOMITE_MUTU", "DIREKTUR"];

type FormState = {
  id?: string;
  name: string;
  email: string;
  role: Role;
  nik: string;
  gelar: string;
  unitId: string;
  isActive: boolean;
  password: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  role: "PIC_UNIT",
  nik: "",
  gelar: "",
  unitId: "",
  isActive: true,
  password: "",
};

export function UsersManager({
  users,
  units,
  currentUserId,
}: {
  users: UserRow[];
  units: UnitOpt[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [unitFilter, setUnitFilter] = useState<string>("");
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (unitFilter && u.unitId !== unitFilter) return false;
      if (q && !(`${u.name} ${u.email} ${u.nik}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [users, query, roleFilter, unitFilter]);

  function openCreate() {
    setError(null);
    setForm({ ...EMPTY_FORM, unitId: units[0]?.id ?? "" });
  }
  function openEdit(u: UserRow) {
    setError(null);
    setForm({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      nik: u.nik,
      gelar: u.gelar,
      unitId: u.unitId,
      isActive: u.isActive,
      password: "",
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    startTransition(async () => {
      const payload = {
        ...form,
        unitId: ALL_UNITS_ROLES.includes(form.role) ? "" : form.unitId,
      };
      const res = form.id
        ? await updateUser(form.id, payload)
        : await createUser(payload);
      if (!res.ok) {
        setError(res.error);
      } else {
        setForm(null);
      }
    });
  }

  function remove(u: UserRow) {
    if (!confirm(`Hapus user "${u.name}" (${u.email})? Tindakan ini tidak bisa dibatalkan.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteUser(u.id);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Manajemen User</h2>
          <p className="text-sm text-slate-500">
            Kelola akun, role, dan unit penanggung jawab.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" /> Tambah User
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama, email, NIK..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          >
            <option value="">Semua Role</option>
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          >
            <option value="">Semua Unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.code} · {u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          ⚠ {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Nama / Email</th>
              <th className="px-4 py-3 text-left font-semibold">Role</th>
              <th className="px-4 py-3 text-left font-semibold">Unit</th>
              <th className="px-4 py-3 text-left font-semibold">NIK</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  Tidak ada user yang cocok.
                </td>
              </tr>
            )}
            {filtered.map((u) => (
              <tr key={u.id} className={cn("hover:bg-slate-50", !u.isActive && "opacity-60")}>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{u.name}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                  {u.gelar && <div className="text-[11px] text-slate-400">{u.gelar}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex rounded px-2 py-0.5 text-xs font-medium", ROLE_STYLE[u.role])}>
                    {ROLE_LABEL[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.unitCode ? (
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{u.unitCode}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[200px]">{u.unitName}</div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{u.nik || "—"}</td>
                <td className="px-4 py-3">
                  {u.isActive ? (
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
                    <button
                      onClick={() => openEdit(u)}
                      className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-600"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {u.id !== currentUserId && (
                      <button
                        onClick={() => remove(u)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-slate-500">
        Total {users.length} user · {users.filter((u) => u.isActive).length} aktif · {filtered.length} ditampilkan
      </div>

      {/* Modal form */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
            onSubmit={submit}
            className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white shadow-xl"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {form.id ? "Edit User" : "Tambah User"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nama Lengkap *">
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Email *">
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Role *">
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                    className={inputCls}
                  >
                    {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                      <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Unit">
                  <select
                    value={form.unitId}
                    onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                    disabled={ALL_UNITS_ROLES.includes(form.role)}
                    className={cn(inputCls, ALL_UNITS_ROLES.includes(form.role) && "bg-slate-100 text-slate-400")}
                  >
                    <option value="">— Pilih Unit —</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.code} · {u.name}</option>
                    ))}
                  </select>
                  {ALL_UNITS_ROLES.includes(form.role) && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Role ini melihat seluruh unit — unit tidak diperlukan.
                    </p>
                  )}
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="NIK">
                  <input
                    maxLength={32}
                    value={form.nik}
                    onChange={(e) => setForm({ ...form, nik: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Gelar">
                  <input
                    maxLength={64}
                    value={form.gelar}
                    onChange={(e) => setForm({ ...form, gelar: e.target.value })}
                    placeholder="Contoh: S.Kep, dr., M.Kes"
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label={form.id ? "Password baru (kosongkan jika tidak diubah)" : "Password *"}>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={form.id ? 0 : 6}
                  required={!form.id}
                  placeholder={form.id ? "•••••• (opsional)" : "Min. 6 karakter"}
                  className={inputCls}
                />
              </Field>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium text-slate-700">Akun aktif</span>
              </label>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {form.id ? "Simpan Perubahan" : "Buat User"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

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
