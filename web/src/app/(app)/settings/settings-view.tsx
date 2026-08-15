"use client";

import { Loader2, Lock, KeyRound, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useState, useTransition } from "react";
import { changePassword } from "./actions";

type FormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const EMPTY: FormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function strength(pw: string) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const STRENGTH_META = [
  { label: "Sangat lemah", color: "bg-red-500", text: "text-red-600" },
  { label: "Lemah", color: "bg-orange-500", text: "text-orange-600" },
  { label: "Cukup", color: "bg-amber-500", text: "text-amber-600" },
  { label: "Kuat", color: "bg-emerald-500", text: "text-emerald-600" },
  { label: "Sangat kuat", color: "bg-emerald-600", text: "text-emerald-700" },
];

export function SettingsView() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPw, setShowPw] = useState({
    cur: false,
    new: false,
    conf: false,
  });
  const [pending, startTransition] = useTransition();

  const s = strength(form.newPassword);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
    setError(null);
    setSuccess(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await changePassword(form);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setForm(EMPTY);
      setSuccess(true);
    });
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-10 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-md bg-emerald-100 text-emerald-700">
            <KeyRound className="size-4.5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Ubah Password
            </h2>
            <p className="text-xs text-slate-500">
              Password baru minimal 6 karakter. Disarankan kombinasi huruf
              besar, kecil, angka, dan simbol.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-5 max-w-md space-y-3">
          <div className="relative">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Password Saat Ini *
            </label>
            <Lock className="pointer-events-none absolute left-3 top-9 size-4 text-slate-400" />
            <input
              type={showPw.cur ? "text" : "password"}
              required
              value={form.currentPassword}
              onChange={(e) => update("currentPassword", e.target.value)}
              placeholder="••••••••"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setShowPw((p) => ({ ...p, cur: !p.cur }))}
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {showPw.cur ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          <div className="relative">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Password Baru *
            </label>
            <Lock className="pointer-events-none absolute left-3 top-9 size-4 text-slate-400" />
            <input
              type={showPw.new ? "text" : "password"}
              required
              value={form.newPassword}
              onChange={(e) => update("newPassword", e.target.value)}
              placeholder="Min. 6 karakter"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setShowPw((p) => ({ ...p, new: !p.new }))}
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {showPw.new ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
            {form.newPassword && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full transition-all ${STRENGTH_META[s].color}`}
                    style={{ width: `${((s + 1) / 5) * 100}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${STRENGTH_META[s].text}`}>
                  {STRENGTH_META[s].label}
                </span>
              </div>
            )}
          </div>

          <div className="relative">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Konfirmasi Password Baru *
            </label>
            <Lock className="pointer-events-none absolute left-3 top-9 size-4 text-slate-400" />
            <input
              type={showPw.conf ? "text" : "password"}
              required
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              placeholder="Ulangi password baru"
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setShowPw((p) => ({ ...p, conf: !p.conf }))}
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {showPw.conf ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
            {form.confirmPassword &&
              form.confirmPassword !== form.newPassword && (
                <p className="mt-1 text-xs text-red-600">
                  Konfirmasi tidak cocok
                </p>
              )}
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              ⚠ {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <CheckCircle2 className="size-4" /> Password berhasil diubah.
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? "Menyimpan..." : "Simpan Password Baru"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold text-slate-900">Tips Keamanan</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
          <li>Gunakan password unik yang tidak dipakai di layanan lain.</li>
          <li>Jangan bagikan password ke siapa pun, termasuk tim IT.</li>
          <li>Ganti password secara berkala, terutama jika mencurigakan.</li>
          <li>Logout dari perangkat umum setelah selesai digunakan.</li>
        </ul>
      </div>
    </div>
  );
}
