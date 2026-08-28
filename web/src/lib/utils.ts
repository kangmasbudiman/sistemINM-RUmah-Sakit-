import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { IndicatorCategory } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CATEGORY_LABEL: Record<IndicatorCategory, string> = {
  INM: "INM",
  IMP: "IMP Unit",
  IMP_RS: "IMP RS",
  IMK: "IMK",
};

export function categoryShortLabel(cat: IndicatorCategory): string {
  return CATEGORY_LABEL[cat];
}

export function indicatorDetailPath(cat: IndicatorCategory, id: string): string {
  if (cat === "IMP") return `/imp/indikator/${id}`;
  if (cat === "IMP_RS") return `/imp-rs/indikator/${id}`;
  if (cat === "IMK") return `/imk/indikator/${id}`;
  return `/indikator/${id}`;
}

export function categoryColorClasses(cat: IndicatorCategory): {
  badge: string;
  dot: string;
} {
  if (cat === "IMP")
    return { badge: "bg-sky-100 text-sky-700", dot: "bg-sky-500" };
  if (cat === "IMP_RS")
    return { badge: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" };
  if (cat === "IMK")
    return { badge: "bg-violet-100 text-violet-700", dot: "bg-violet-500" };
  return { badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" };
}

export function formatPct(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function monthNames(): string[] {
  return [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
}

export function monthLabel(month: number): string {
  return monthNames()[month - 1] ?? "";
}
