"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CATEGORY_VALUES = ["INM", "IMP", "IMP_RS", "IMK"] as const;

export type MasterResult =
  | { ok: true }
  | { ok: false; error: string };

async function assertAdmin() {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return { error: "Hanya ADMIN yang dapat mengelola master data" as const };
  }
  return { error: null };
}

// ─── PENGATURAN INPUT ───────────────────────────────────────────────────
export async function saveInputSettings(input: {
  restrictEditWindow: boolean;
}): Promise<MasterResult> {
  const { error } = await assertAdmin();
  if (error) return { ok: false, error };

  const parsed = z
    .object({ restrictEditWindow: z.boolean() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Input tidak valid" };

  try {
    await prisma.siteSetting.upsert({
      where: { id: "singleton" },
      update: { restrictEditWindow: parsed.data.restrictEditWindow },
      create: { id: "singleton", restrictEditWindow: parsed.data.restrictEditWindow },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan pengaturan" };
  }

  revalidatePath("/admin/master");
  revalidatePath("/input");
  revalidatePath("/imp/input");
  revalidatePath("/imp-rs/input");
  revalidatePath("/imk/input");
  return { ok: true };
}

// ─── UNIT ───────────────────────────────────────────────────────────────
const unitCreateSchema = z.object({
  code: z.string().min(1, "Code wajib").max(32).regex(/^[A-Z0-9_]+$/, "Code huruf besar/angka/_"),
  name: z.string().min(1, "Nama wajib").max(120),
  description: z.string().max(500).optional().or(z.literal("")),
  orderNo: z.coerce.number().int().min(0).max(9999),
});

const unitUpdateSchema = unitCreateSchema.partial().extend({
  id: z.string().cuid(),
});

export async function createUnit(input: z.infer<typeof unitCreateSchema>): Promise<MasterResult> {
  const { error } = await assertAdmin();
  if (error) return { ok: false, error };

  const parsed = unitCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }
  const { code, name, description, orderNo } = parsed.data;

  const clash = await prisma.unit.findUnique({ where: { code } });
  if (clash) return { ok: false, error: "Kode unit sudah dipakai" };

  try {
    await prisma.unit.create({
      data: { code: code.toUpperCase(), name, description: description || null, orderNo },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal membuat unit" };
  }
  revalidatePath("/admin/master");
  revalidatePath("/indikator");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateUnit(input: z.infer<typeof unitUpdateSchema>): Promise<MasterResult> {
  const { error } = await assertAdmin();
  if (error) return { ok: false, error };

  const parsed = unitUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }
  const { id, ...data } = parsed.data;

  if (data.code) {
    const clash = await prisma.unit.findFirst({
      where: { code: data.code.toUpperCase(), NOT: { id } },
    });
    if (clash) return { ok: false, error: "Kode unit sudah dipakai" };
  }

  try {
    const updates: Record<string, unknown> = { ...data };
    if (data.code) updates.code = data.code.toUpperCase();
    if ("description" in updates) updates.description = data.description || null;
    await prisma.unit.update({ where: { id }, data: updates });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal update unit" };
  }
  revalidatePath("/admin/master");
  revalidatePath("/indikator");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteUnit(id: string): Promise<MasterResult> {
  const { error } = await assertAdmin();
  if (error) return { ok: false, error };

  const idParsed = z.string().cuid().safeParse(id);
  if (!idParsed.success) return { ok: false, error: "ID tidak valid" };

  const inUse = await prisma.indicator.count({ where: { unitId: id } });
  if (inUse > 0) {
    return { ok: false, error: `Unit masih punya ${inUse} indikator. Hapus/pindahkan dulu.` };
  }
  const userCount = await prisma.user.count({ where: { unitId: id } });
  if (userCount > 0) {
    return { ok: false, error: `Unit masih dipakai ${userCount} user. Pindahkan dulu.` };
  }

  try {
    await prisma.unit.delete({ where: { id } });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menghapus unit" };
  }
  revalidatePath("/admin/master");
  revalidatePath("/indikator");
  revalidatePath("/dashboard");
  return { ok: true };
}

export type CopyResult =
  | { ok: true; copied: number; skipped: number }
  | { ok: false; error: string };

export async function copyUnitIndicators(input: {
  sourceUnitId: string;
  targetUnitId: string;
  categories: ("INM" | "IMP" | "IMP_RS" | "IMK")[];
}): Promise<CopyResult> {
  const { error } = await assertAdmin();
  if (error) return { ok: false, error };

  const parsed = z
    .object({
      sourceUnitId: z.string().cuid(),
      targetUnitId: z.string().cuid(),
      categories: z.array(z.enum(CATEGORY_VALUES)).min(1),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }
  const { sourceUnitId, targetUnitId, categories } = parsed.data;

  if (sourceUnitId === targetUnitId) {
    return { ok: false, error: "Unit sumber dan tujuan tidak boleh sama" };
  }

  const [source, target] = await Promise.all([
    prisma.unit.findUnique({ where: { id: sourceUnitId } }),
    prisma.unit.findUnique({ where: { id: targetUnitId } }),
  ]);
  if (!source) return { ok: false, error: "Unit sumber tidak ditemukan" };
  if (!target) return { ok: false, error: "Unit tujuan tidak ditemukan" };

  const sourceIndicators = await prisma.indicator.findMany({
    where: { unitId: sourceUnitId, category: { in: categories } },
    orderBy: [{ category: "asc" }, { orderNo: "asc" }],
  });
  if (sourceIndicators.length === 0) {
    return { ok: false, error: "Unit sumber tidak punya indikator pada kategori terpilih" };
  }

  const existing = await prisma.indicator.findMany({
    where: { unitId: targetUnitId },
    select: { category: true, code: true },
  });
  const existingKeys = new Set(existing.map((i) => `${i.category}:${i.code}`));

  const toCreate = sourceIndicators.filter(
    (i) => !existingKeys.has(`${i.category}:${i.code}`)
  );

  try {
    await prisma.$transaction(
      toCreate.map((i) =>
        prisma.indicator.create({
          data: {
            unitId: targetUnitId,
            category: i.category,
            code: i.code,
            title: i.title,
            numeratorLabel: i.numeratorLabel,
            denominatorLabel: i.denominatorLabel,
            targetPct: i.targetPct,
            orderNo: i.orderNo,
            isActive: i.isActive,
          },
        })
      )
    );
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menyalin indikator" };
  }

  revalidatePath("/admin/master");
  revalidatePath("/indikator");
  revalidatePath("/dashboard");
  revalidatePath("/imp/dashboard");
  return {
    ok: true,
    copied: toCreate.length,
    skipped: sourceIndicators.length - toCreate.length,
  };
}

// ─── INDICATOR ──────────────────────────────────────────────────────────
const indicatorCreateSchema = z.object({
  unitId: z.string().cuid(),
  category: z.enum(CATEGORY_VALUES),
  code: z.string().min(1, "Code wajib").max(64),
  title: z.string().min(1, "Judul wajib").max(255),
  numeratorLabel: z.string().min(1, "Label pembilang wajib").max(500),
  denominatorLabel: z.string().min(1, "Label penyebut wajib").max(500),
  targetPct: z.coerce.number().min(0).max(100),
  orderNo: z.coerce.number().int().min(0).max(9999),
  isActive: z.boolean(),
});

const indicatorUpdateSchema = indicatorCreateSchema.partial().extend({
  id: z.string().cuid(),
});

export async function createIndicator(
  input: z.infer<typeof indicatorCreateSchema>
): Promise<MasterResult> {
  const { error } = await assertAdmin();
  if (error) return { ok: false, error };

  const parsed = indicatorCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }
  const { unitId, category, code, title, numeratorLabel, denominatorLabel, targetPct, orderNo, isActive } = parsed.data;

  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) return { ok: false, error: "Unit tidak ditemukan" };

  const clash = await prisma.indicator.findUnique({
    where: { category_unitId_code: { category, unitId, code } },
  });
  if (clash) {
    return { ok: false, error: `Kode ${code} sudah dipakai untuk kategori ${category} di unit ini` };
  }

  try {
    await prisma.indicator.create({
      data: {
        unitId,
        category,
        code,
        title,
        numeratorLabel,
        denominatorLabel,
        targetPct,
        orderNo,
        isActive,
      },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal membuat indikator" };
  }
  revalidatePath("/admin/master");
  revalidatePath("/indikator");
  revalidatePath("/imp/indikator");
  revalidatePath("/dashboard");
  revalidatePath("/imp/dashboard");
  return { ok: true };
}

export async function updateIndicator(
  input: z.infer<typeof indicatorUpdateSchema>
): Promise<MasterResult> {
  const { error } = await assertAdmin();
  if (error) return { ok: false, error };

  const parsed = indicatorUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }
  const { id, ...data } = parsed.data;

  try {
    await prisma.indicator.update({ where: { id }, data });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal update indikator" };
  }
  revalidatePath("/admin/master");
  revalidatePath("/indikator");
  revalidatePath("/imp/indikator");
  revalidatePath("/dashboard");
  revalidatePath("/imp/dashboard");
  return { ok: true };
}

export async function deleteIndicator(id: string): Promise<MasterResult> {
  const { error } = await assertAdmin();
  if (error) return { ok: false, error };

  const idParsed = z.string().cuid().safeParse(id);
  if (!idParsed.success) return { ok: false, error: "ID tidak valid" };

  const obs = await prisma.observation.count({ where: { indicatorId: id } });
  if (obs > 0) {
    return { ok: false, error: `Indikator masih punya ${obs} observasi. Hapus data dulu atau nonaktifkan.` };
  }

  try {
    await prisma.indicator.delete({ where: { id } });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menghapus indikator" };
  }
  revalidatePath("/admin/master");
  revalidatePath("/indikator");
  revalidatePath("/imp/indikator");
  revalidatePath("/dashboard");
  revalidatePath("/imp/dashboard");
  return { ok: true };
}
