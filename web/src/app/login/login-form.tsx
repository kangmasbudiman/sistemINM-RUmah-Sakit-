"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, Mail, Check, AlertCircle } from "lucide-react";
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

const schema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

type FormValues = z.infer<typeof schema>;

type LoginSettings = {
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

export function LoginForm({ settings }: { settings: LoginSettings }) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const res = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (res?.error) {
      setServerError("Email atau password salah, atau akun nonaktif.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  const BrandIcon = ICON_MAP[settings.brandIcon] ?? Activity;
  const bullets = [settings.sideBullet1, settings.sideBullet2, settings.sideBullet3].filter(
    (b): b is string => !!b && b.trim().length > 0
  );

  const sideStyle = settings.sideImageUrl
    ? ({
        backgroundImage: `linear-gradient(135deg, rgba(6,78,59,0.92) 0%, rgba(4,120,87,0.85) 50%, rgba(15,118,110,0.85) 100%), url(${settings.sideImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      } as React.CSSProperties)
    : ({
        background:
          "linear-gradient(135deg, #042f2e 0%, #064e3b 35%, #047857 70%, #0f766e 100%)",
      } as React.CSSProperties);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ─── LEFT SIDE — branding panel ─────────────────────────────────── */}
      <aside
        className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex xl:p-14"
        style={sideStyle}
      >
        {/* Glow accents */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-teal-300/20 blur-3xl" />

        {/* Top: logo + badge */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/25">
            <BrandIcon className="h-6 w-6" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white/90">Sistem INM RS</div>
            <div className="text-xs text-white/70">Royal Prima Jambi</div>
          </div>
        </div>

        {/* Middle: headline + paragraph + bullets */}
        <div className="relative z-10 max-w-xl">
          {settings.sideBadge && (
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur ring-1 ring-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              {settings.sideBadge}
            </div>
          )}
          <h2 className="text-3xl font-bold leading-tight xl:text-4xl">
            {settings.sideHeadline}
          </h2>
          {settings.sideParagraph && (
            <p className="mt-4 text-sm leading-relaxed text-white/80 xl:text-base">
              {settings.sideParagraph}
            </p>
          )}
          {bullets.length > 0 && (
            <ul className="mt-6 space-y-2.5">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-white/90">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/30 ring-1 ring-emerald-300/40">
                    <Check className="h-3 w-3" />
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Bottom: footer quote */}
        <div className="relative z-10 text-xs text-white/60">
          {settings.footerText}
        </div>
      </aside>

      {/* ─── RIGHT SIDE — form panel ────────────────────────────────────── */}
      <div className="flex items-center justify-center bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Mobile branding (visible only on small screens) */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
              <BrandIcon className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">{settings.brandTitle}</h1>
            {settings.brandSubtitle && (
              <p className="mt-1 text-xs text-slate-500">{settings.brandSubtitle}</p>
            )}
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {/* Desktop heading (hidden on mobile — branding shown above) */}
            <div className="mb-6 hidden lg:block">
              <h2 className="text-2xl font-bold text-slate-900">Selamat datang</h2>
              <p className="mt-1 text-sm text-slate-500">
                Masuk untuk mengakses dashboard pemantauan mutu.
              </p>
            </div>

            {serverError && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="nama@rsrpjambi.id"
                    {...register("email")}
                    className="block w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register("password")}
                    className="block w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Memproses...
                  </>
                ) : (
                  "Masuk ke Dashboard"
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            {settings.footerText}
          </p>
        </div>
      </div>
    </div>
  );
}
