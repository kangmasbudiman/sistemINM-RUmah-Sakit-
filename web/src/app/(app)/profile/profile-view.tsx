"use client";

import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  ClipboardList,
  FileBarChart,
  IdCard,
  Mail,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";

type ProfileUser = {
  name: string;
  email: string;
  role: string;
  nik: string | null;
  gelar: string | null;
  unitCode: string | null;
  unitName: string | null;
  isActive: boolean;
  createdAt: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="grid size-9 place-items-center rounded-md bg-slate-100 text-slate-600">
        <Icon className="size-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {label}
        </div>
        <div className="truncate text-sm font-semibold text-slate-900">
          {value || <span className="text-slate-400">—</span>}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className={`grid size-8 place-items-center rounded-md ${tone}`}>
          <Icon className="size-4" />
        </span>
        <span className="text-xs font-medium uppercase text-slate-500">
          {label}
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export function ProfileView({
  user,
  observationCount,
  analysisTouched,
}: {
  user: ProfileUser;
  observationCount: number;
  analysisTouched: number;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6">
        <div className="flex flex-wrap items-center gap-5">
          <div className="grid size-20 place-items-center rounded-full bg-emerald-600 text-2xl font-bold text-white">
            {initials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900">{user.name}</h2>
              {user.isActive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  <BadgeCheck className="size-3.5" /> Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  Nonaktif
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <Mail className="size-4" />
              <span>{user.email}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary">
                <ShieldCheck className="size-3.5" /> {user.role}
              </span>
              {user.unitCode && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700">
                  <Briefcase className="size-3.5" /> {user.unitCode}
                  {user.unitName ? ` · ${user.unitName}` : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={ClipboardList}
          label="Observasi Dibuat"
          value={observationCount}
          tone="bg-blue-100 text-blue-700"
        />
        <StatCard
          icon={FileBarChart}
          label="Analisa Terlibat"
          value={analysisTouched}
          tone="bg-purple-100 text-purple-700"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Row icon={UserIcon} label="Nama Lengkap" value={user.name} />
        <Row icon={Mail} label="Email" value={user.email} />
        <Row icon={IdCard} label="NIK" value={user.nik} />
        <Row icon={BadgeCheck} label="Gelar" value={user.gelar} />
        <Row
          icon={Briefcase}
          label="Unit"
          value={
            user.unitCode ? `${user.unitCode} · ${user.unitName}` : null
          }
        />
        <Row
          icon={CalendarDays}
          label="Bergabung Sejak"
          value={formatDate(user.createdAt)}
        />
      </div>
    </div>
  );
}
