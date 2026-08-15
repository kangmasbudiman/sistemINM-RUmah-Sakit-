"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ALL_UNITS_ROLES, canApprove, canValidate } from "@/lib/auth-helpers";
import { z } from "zod";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

const idSchema = z.string().cuid();
const noteSchema = z.string().max(2000).default("");

async function assertAccess(
  analysisId: string,
  opts: { requireApprover?: boolean; requireValidator?: boolean } = {}
) {
  const session = await auth();
  if (!session?.user) return { error: "Belum login", analysis: null, session: null };

  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: { indicator: { include: { unit: true } } },
  });
  if (!analysis) return { error: "Analisa tidak ditemukan", analysis: null, session };

  if (opts.requireApprover && !canApprove(session.user)) {
    return { error: "Anda tidak punya hak approve/reject", analysis: null, session };
  }
  if (opts.requireValidator && !canValidate(session.user)) {
    return { error: "Anda tidak punya hak validasi", analysis: null, session };
  }

  const isAllUnits = (ALL_UNITS_ROLES as readonly string[]).includes(
    session.user.role
  );
  if (!isAllUnits && analysis.unitId !== session.user.unitId) {
    return { error: "Tidak punya akses ke analisa ini", analysis: null, session };
  }

  return { error: null, analysis, session };
}

export async function submitAnalysis(
  analysisId: string
): Promise<ActionResult> {
  const parsed = idSchema.safeParse(analysisId);
  if (!parsed.success) return { ok: false, error: "ID tidak valid" };

  const { error, analysis, session } = await assertAccess(parsed.data);
  if (error || !analysis || !session) return { ok: false, error };

  if (session.user.role === "DATA_COLLECTOR" || session.user.role === "DIREKTUR") {
    return { ok: false, error: "Role Anda tidak dapat submit analisa" };
  }

  if (analysis.status === "APPROVED") {
    return { ok: false, error: "Sudah di-approve, tidak bisa diubah" };
  }
  if (analysis.status === "SUBMITTED" || analysis.status === "VALIDATED") {
    return { ok: false, error: "Sudah dalam antrean validasi/approval" };
  }

  try {
    await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        rejectionNote: null,
        // Reset jejak validasi kalau sebelumnya ditolak
        validatedAt: null,
        validatedById: null,
        validationNote: null,
      },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal submit" };
  }

  revalidatePath("/analisa");
  revalidatePath("/imp/analisa");
  revalidatePath("/dashboard");
  revalidatePath("/imp/dashboard");
  return { ok: true };
}

/**
 * VALIDATOR (Kepala Ruangan) memvalidasi analisa yang sudah disubmit.
 * Status SUBMITTED → VALIDATED.
 */
export async function validateAnalysis(
  analysisId: string,
  note?: string
): Promise<ActionResult> {
  const parsed = idSchema.safeParse(analysisId);
  if (!parsed.success) return { ok: false, error: "ID tidak valid" };

  const noteParsed = noteSchema.safeParse(note ?? "");
  if (!noteParsed.success) {
    return { ok: false, error: "Catatan validasi tidak valid" };
  }

  const { error, analysis, session } = await assertAccess(parsed.data, {
    requireValidator: true,
  });
  if (error || !analysis || !session) return { ok: false, error };

  if (analysis.status !== "SUBMITTED") {
    return {
      ok: false,
      error: "Hanya analisa berstatus SUBMITTED yang bisa divalidasi",
    };
  }

  try {
    await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        status: "VALIDATED",
        validatedAt: new Date(),
        validatedById: session.user.id,
        validationNote: noteParsed.data.trim() || null,
      },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal validasi" };
  }

  revalidatePath("/analisa");
  revalidatePath("/imp/analisa");
  revalidatePath("/dashboard");
  revalidatePath("/imp/dashboard");
  revalidatePath(`/indikator/${analysis.indicatorId}`);
  revalidatePath(`/imp/indikator/${analysis.indicatorId}`);
  return { ok: true };
}

/**
 * VALIDATOR mengembalikan analisa ke PIC untuk direvisi.
 * Status SUBMITTED → DRAFT dengan catatan.
 */
export async function returnAnalysis(
  analysisId: string,
  note: string
): Promise<ActionResult> {
  const parsed = idSchema.safeParse(analysisId);
  if (!parsed.success) return { ok: false, error: "ID tidak valid" };

  const noteParsed = noteSchema.safeParse(note ?? "");
  if (!noteParsed.success || !noteParsed.data.trim()) {
    return { ok: false, error: "Alasan pengembalian wajib diisi" };
  }

  const { error, analysis } = await assertAccess(parsed.data, {
    requireValidator: true,
  });
  if (error || !analysis) return { ok: false, error };

  if (analysis.status !== "SUBMITTED") {
    return {
      ok: false,
      error: "Hanya analisa berstatus SUBMITTED yang bisa dikembalikan",
    };
  }

  try {
    await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        status: "DRAFT",
        validationNote: noteParsed.data.trim(),
      },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal mengembalikan" };
  }

  revalidatePath("/analisa");
  revalidatePath("/imp/analisa");
  revalidatePath("/dashboard");
  revalidatePath("/imp/dashboard");
  revalidatePath(`/indikator/${analysis.indicatorId}`);
  revalidatePath(`/imp/indikator/${analysis.indicatorId}`);
  return { ok: true };
}

export async function approveAnalysis(
  analysisId: string
): Promise<ActionResult> {
  const parsed = idSchema.safeParse(analysisId);
  if (!parsed.success) return { ok: false, error: "ID tidak valid" };

  const { error, analysis, session } = await assertAccess(parsed.data, {
    requireApprover: true,
  });
  if (error || !analysis || !session) return { ok: false, error };

  if (
    analysis.status !== "SUBMITTED" &&
    analysis.status !== "VALIDATED" &&
    analysis.status !== "REJECTED"
  ) {
    return {
      ok: false,
      error: "Analisa harus berstatus SUBMITTED, VALIDATED, atau REJECTED",
    };
  }

  try {
    await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: session.user.id,
        rejectionNote: null,
      },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal approve" };
  }

  revalidatePath("/analisa");
  revalidatePath("/imp/analisa");
  revalidatePath("/dashboard");
  revalidatePath("/imp/dashboard");
  revalidatePath(`/indikator/${analysis.indicatorId}`);
  revalidatePath(`/imp/indikator/${analysis.indicatorId}`);
  return { ok: true };
}

export async function rejectAnalysis(
  analysisId: string,
  note: string
): Promise<ActionResult> {
  const parsed = idSchema.safeParse(analysisId);
  if (!parsed.success) return { ok: false, error: "ID tidak valid" };

  const noteParsed = noteSchema.safeParse(note ?? "");
  if (!noteParsed.success || !noteParsed.data.trim()) {
    return { ok: false, error: "Alasan penolakan wajib diisi" };
  }

  const { error, analysis, session } = await assertAccess(parsed.data, {
    requireApprover: true,
  });
  if (error || !analysis || !session) return { ok: false, error };

  if (analysis.status !== "SUBMITTED" && analysis.status !== "VALIDATED") {
    return {
      ok: false,
      error: "Analisa harus berstatus SUBMITTED atau VALIDATED",
    };
  }

  try {
    await prisma.analysis.update({
      where: { id: analysis.id },
      data: {
        status: "REJECTED",
        approvedAt: new Date(),
        approvedById: session.user.id,
        rejectionNote: noteParsed.data.trim(),
      },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal reject" };
  }

  revalidatePath("/analisa");
  revalidatePath("/imp/analisa");
  revalidatePath("/dashboard");
  revalidatePath("/imp/dashboard");
  revalidatePath(`/indikator/${analysis.indicatorId}`);
  revalidatePath(`/imp/indikator/${analysis.indicatorId}`);
  return { ok: true };
}
