"use client";

import { useState, useTransition } from "react";
import {
  Loader2,
  Save,
  Eye,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import {
  Activity,
  HeartPulse,
  Stethoscope,
  Cross,
  Plus,
  ShieldPlus,
  Hospital,
  BriefcaseMedical,
  ClipboardPlus,
  ClipboardCheck,
  Microscope,
  ClipboardList,
  Heart,
  SquareActivity,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { saveLoginSettings } from "./actions";

const ICON_MAP: Record<string, LucideIcon> = {
  Activity,
  HeartPulse,
  Stethoscope,
  Cross,
  Plus,
  ShieldPlus,
  Hospital,
  BriefcaseMedical,
  ClipboardPlus,
  ClipboardCheck,
  Microscope,
  ClipboardList,
  Heart,
  SquareActivity,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

type InitialSettings = {
  id: string;
  brandIcon: string;
  brandTitle: string;
  brandSubtitle: string;
  sideImageUrl: string | null;
  sideBadge: string;
  sideHeadline: string;
  sideParagraph: string;
  sideBullet1: string;
  sideBullet2: string;
  sideBullet3: string;
  footerText: string;
};

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none";

const labelCls = "mb-1 block text-xs font-semibold text-slate-700";

export function LoginSettingsForm({ initial }: { initial: InitialSettings }) {
  const [form, setForm] = useState<InitialSettings>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof InitialSettings>(key: K, value: InitialSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await saveLoginSettings({
        brandIcon: form.brandIcon,
        brandTitle: form.brandTitle,
        brandSubtitle: form.brandSubtitle,
        sideImageUrl: form.sideImageUrl ?? "",
        sideBadge: form.sideBadge,
        sideHeadline: form.sideHeadline,
        sideParagraph: form.sideParagraph,
        sideBullet1: form.sideBullet1,
        sideBullet2: form.sideBullet2,
        sideBullet3: form.sideBullet3,
        footerText: form.footerText,
      });
      if (!res.ok) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Tampilan Halaman Login</h2>
        <p className="text-sm text-slate-500">
          Atur ikon, judul, gambar sisi kiri, dan teks lainnya. Perubahan langsung tampil di halaman login.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          <Check className="h-4 w-4 shrink-0" />
          Perubahan tersimpan.
        </div>
      )}

      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_24rem]">
        {/* Editor */}
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
          {/* Ikon */}
          <div>
            <label className={labelCls}>Ikon Branding (atas form)</label>
            <div className="mt-1 grid grid-cols-7 gap-1.5">
              {ICON_OPTIONS.map((name) => {
                const Ic = ICON_MAP[name] ?? Activity;
                const active = form.brandIcon === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => update("brandIcon", name)}
                    title={name}
                    className={cn(
                      "grid aspect-square place-items-center rounded-lg border text-slate-600 transition-colors",
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-600 ring-2 ring-emerald-500/20"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <Ic className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">Ikon terpilih: <span className="font-mono">{form.brandIcon}</span></p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Judul Branding *</label>
              <input
                required
                maxLength={120}
                value={form.brandTitle}
                onChange={(e) => update("brandTitle", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Subjudul Branding</label>
              <input
                maxLength={180}
                value={form.brandSubtitle}
                onChange={(e) => update("brandSubtitle", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Panel Sisi Kiri</div>

          <div>
            <label className={labelCls}>URL Gambar Background (opsional)</label>
            <input
              type="url"
              maxLength={500}
              placeholder="https://images.unsplash.com/...  (kosongkan untuk gradient)"
              value={form.sideImageUrl ?? ""}
              onChange={(e) => update("sideImageUrl", e.target.value || null)}
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Rekomendasi: Unsplash / CDN. Kosongkan untuk memakai gradient emerald default.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Badge (teks kecil di atas headline)</label>
              <input
                maxLength={80}
                value={form.sideBadge}
                onChange={(e) => update("sideBadge", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Headline Besar</label>
              <input
                maxLength={180}
                value={form.sideHeadline}
                onChange={(e) => update("sideHeadline", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Paragraf</label>
            <textarea
              rows={3}
              maxLength={500}
              value={form.sideParagraph}
              onChange={(e) => update("sideParagraph", e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Bullet 1</label>
              <input maxLength={160} value={form.sideBullet1} onChange={(e) => update("sideBullet1", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Bullet 2</label>
              <input maxLength={160} value={form.sideBullet2} onChange={(e) => update("sideBullet2", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Bullet 3</label>
              <input maxLength={160} value={form.sideBullet3} onChange={(e) => update("sideBullet3", e.target.value)} className={inputCls} />
            </div>
          </div>

          <hr className="border-slate-100" />

          <div>
            <label className={labelCls}>Teks Footer</label>
            <input
              maxLength={160}
              value={form.footerText}
              onChange={(e) => update("footerText", e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setForm(initial)}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
            >
              <X className="h-4 w-4" /> Reset
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Perubahan
            </button>
          </div>
        </div>

        {/* Live preview */}
        <div>
          <div className="sticky top-24">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
              <Eye className="h-3.5 w-3.5" /> Preview Live
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
              <div className="grid min-h-[24rem] grid-cols-2">
                {/* Left side preview */}
                <div
                  className="relative flex flex-col justify-between p-3 text-white"
                  style={
                    form.sideImageUrl
                      ? {
                          backgroundImage: `linear-gradient(to bottom right, rgba(6,78,59,0.85), rgba(15,118,110,0.85)), url(${form.sideImageUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : {
                          background:
                            "linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f766e 100%)",
                        }
                  }
                >
                  {form.sideBadge && (
                    <div className="inline-flex w-fit items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[8px] font-semibold backdrop-blur">
                      {form.sideBadge}
                    </div>
                  )}
                  <div>
                    <div className="text-[11px] font-bold leading-tight">
                      {form.sideHeadline || "—"}
                    </div>
                    <ul className="mt-1 space-y-0.5 text-[7px] text-white/85">
                      {[form.sideBullet1, form.sideBullet2, form.sideBullet3].map((b, i) => b ? (
                        <li key={i} className="flex items-start gap-1">
                          <Check className="mt-0.5 h-1.5 w-1.5 shrink-0" /> {b}
                        </li>
                      ) : null)}
                    </ul>
                  </div>
                </div>
                {/* Right side preview */}
                <div className="flex flex-col items-center justify-center bg-white p-3 text-center">
                  {(() => {
                    const Ic = ICON_MAP[form.brandIcon] ?? Activity;
                    return (
                      <div className="mb-1 grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                        <Ic className="h-3.5 w-3.5" />
                      </div>
                    );
                  })()}
                  <div className="text-[9px] font-bold text-slate-900">{form.brandTitle}</div>
                  <div className="text-[7px] text-slate-500">{form.brandSubtitle}</div>
                  <div className="mt-2 h-3 w-full rounded bg-slate-100" />
                  <div className="mt-1 h-3 w-full rounded bg-slate-100" />
                  <div className="mt-2 h-4 w-full rounded bg-emerald-600" />
                  <div className="mt-1 text-[6px] text-slate-400">{form.footerText}</div>
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Preview adalah representasi kasar. Tampilan sebenarnya mungkin sedikit berbeda karena responsif terhadap ukuran layar.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
