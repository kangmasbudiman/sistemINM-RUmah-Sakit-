"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ALL_UNITS_ROLES } from "@/lib/auth-helpers";
import { EDIT_WINDOW_DAYS, diffDaysFromToday, todayYmd } from "@/lib/date-window";
import { getRestrictEditWindow } from "@/lib/app-settings";
import { z } from "zod";

const rowSchema = z.object({
  date: z.string(), // ISO date (YYYY-MM-DD)
  numerator: z.number().int().min(0),
  denominator: z.number().int().min(0),
});

const analysisSchema = z.object({
  analisaText: z.string().default(""),
  pdsaPlan: z.string().default(""),
  pdsaDo: z.string().default(""),
  pdsaStudy: z.string().default(""),
  pdsaAct: z.string().default(""),
  dataCollector: z.string().default(""),
  picName: z.string().default(""),
  picNik: z.string().max(32).default(""),
});

const saveSchema = z.object({
  indicatorId: z.string().cuid(),
  periodMonth: z.number().int().min(1).max(12),
  periodYear: z.number().int().min(2020),
  rows: z.array(rowSchema),
  analysis: analysisSchema,
});

export type SaveResult =
  | { ok: true; saved: number }
  | { ok: false; error: string };

export async function saveIndicatorData(
  input: z.infer<typeof saveSchema>
): Promise<SaveResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Belum login" };

  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Input tidak valid" };
  }

  const { indicatorId, periodMonth, periodYear, rows, analysis } = parsed.data;

  const indicator = await prisma.indicator.findUnique({
    where: { id: indicatorId },
    select: { unitId: true, id: true },
  });
  if (!indicator) return { ok: false, error: "Indikator tidak ditemukan" };

  const isAllUnits = (ALL_UNITS_ROLES as readonly string[]).includes(
    session.user.role
  );
  if (!isAllUnits && indicator.unitId !== session.user.unitId) {
    return { ok: false, error: "Tidak punya akses ke indikator ini" };
  }

  const restrictWindow = await getRestrictEditWindow();
  if (restrictWindow) {
    // Periode selain bulan berjalan bersifat view-only (bulan lampau hanya untuk laporan)
    const todayS = todayYmd();
    const curYear = Number(todayS.slice(0, 4));
    const curMonth = Number(todayS.slice(5, 7));
    if (periodYear !== curYear || periodMonth !== curMonth) {
      return {
        ok: false,
        error:
          "Periode bulan sebelumnya hanya untuk dilihat (laporan). Pengisian hanya diizinkan untuk bulan berjalan.",
      };
    }
    const outOfWindow: string[] = [];
    for (const row of rows) {
      const diff = diffDaysFromToday(row.date, todayYmd());
      if (diff < 0 || diff >= EDIT_WINDOW_DAYS) {
        outOfWindow.push(row.date);
      }
    }
    if (outOfWindow.length > 0) {
      return {
        ok: false,
        error: `Tanggal di luar jendela ${EDIT_WINDOW_DAYS} hari: ${outOfWindow.join(", ")}`,
      };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Upsert observations
      let saved = 0;
      for (const row of rows) {
        const date = new Date(row.date + "T00:00:00.000Z");
        if (Number.isNaN(date.getTime())) continue;

        const existing = await tx.observation.findUnique({
          where: {
            indicatorId_observationDate: {
              indicatorId,
              observationDate: date,
            },
          },
        });

        if (existing) {
          if (
            existing.numeratorValue !== row.numerator ||
            existing.denominatorValue !== row.denominator
          ) {
            await tx.observation.update({
              where: { id: existing.id },
              data: {
                numeratorValue: row.numerator,
                denominatorValue: row.denominator,
              },
            });
            saved++;
          }
        } else if (row.numerator > 0 || row.denominator > 0) {
          await tx.observation.create({
            data: {
              indicatorId,
              unitId: indicator.unitId,
              observationDate: date,
              numeratorValue: row.numerator,
              denominatorValue: row.denominator,
              createdById: session.user.id,
            },
          });
          saved++;
        }
      }

      // Upsert analysis
      const existingAnalysis = await tx.analysis.findUnique({
        where: {
          indicatorId_periodMonth_periodYear: {
            indicatorId,
            periodMonth,
            periodYear,
          },
        },
      });

      const analysisData = {
        analisaText: analysis.analisaText,
        pdsaPlan: analysis.pdsaPlan,
        pdsaDo: analysis.pdsaDo,
        pdsaStudy: analysis.pdsaStudy,
        pdsaAct: analysis.pdsaAct,
        dataCollector: analysis.dataCollector,
        picName: analysis.picName,
        picNik: analysis.picNik,
      };

      if (existingAnalysis) {
        if (existingAnalysis.status === "APPROVED") {
          throw new Error("Analisa sudah di-approve. Tidak dapat diubah.");
        }
        await tx.analysis.update({
          where: { id: existingAnalysis.id },
          data: { ...analysisData, status: "DRAFT" },
        });
      } else {
        await tx.analysis.create({
          data: {
            indicatorId,
            unitId: indicator.unitId,
            periodMonth,
            periodYear,
            ...analysisData,
            status: "DRAFT",
          },
        });
      }
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal menyimpan",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/imp/dashboard");
  revalidatePath("/input");
  revalidatePath("/imp/input");
  revalidatePath(`/indikator/${indicatorId}`);
  revalidatePath(`/imp/indikator/${indicatorId}`);

  return { ok: true, saved: rows.length };
}
