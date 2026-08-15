import { prisma } from "@/lib/prisma";
import type { SiteSetting } from "@prisma/client";

export type LoginSettings = Pick<
  SiteSetting,
  | "id"
  | "brandIcon"
  | "brandTitle"
  | "brandSubtitle"
  | "sideImageUrl"
  | "sideBadge"
  | "sideHeadline"
  | "sideParagraph"
  | "sideBullet1"
  | "sideBullet2"
  | "sideBullet3"
  | "footerText"
>;

const DEFAULTS: Omit<LoginSettings, "id"> = {
  brandIcon: "Activity",
  brandTitle: "Sistem INM Rumah Sakit",
  brandSubtitle: "Royal Prima Jambi · Indikator Mutu Nasional",
  sideImageUrl: null,
  sideBadge: "RS Royal Prima Jambi",
  sideHeadline: "Pemantauan Mutu Rumah Sakit",
  sideParagraph:
    "Sistem pemantauan Indikator Mutu Nasional dan Prioritas untuk menjamin pelayanan yang aman, efektif, dan bermutu bagi setiap pasien.",
  sideBullet1: "Indikator INM & IMP lintas unit",
  sideBullet2: "Dashboard real-time & analisa PDSA",
  sideBullet3: "Workflow approval Komite Mutu",
  footerText: "© Tim Mutu RS Royal Prima Jambi",
};

/** Ambil pengaturan login (selalu kembalikan semua field, fallback ke default). */
export async function getLoginSettings(): Promise<LoginSettings> {
  const row = await prisma.siteSetting.findUnique({ where: { id: "singleton" } });
  if (!row) {
    return { id: "singleton", ...DEFAULTS };
  }
  return { ...row };
}

/** Sediakan daftar ikon Lucide yang bisa dipilih admin. */
export const LOGIN_ICON_OPTIONS = [
  "Activity",
  "HeartPulse",
  "Stethoscope",
  "Cross",
  "Plus",
  "ShieldPlus",
  "Hospital",
  "BriefcaseMedical",
  "ClipboardPlus",
  "ClipboardCheck",
  "Microscope",
  "ClipboardList",
  "BadgeHeart",
  "SquareActivity",
] as const;
