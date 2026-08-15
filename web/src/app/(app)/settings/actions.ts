"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

export type SettingsResult =
  | { ok: true }
  | { ok: false; error: string };

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
    newPassword: z
      .string()
      .min(6, "Password baru minimal 6 karakter")
      .max(120),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "Password baru tidak boleh sama dengan password saat ini",
    path: ["newPassword"],
  });

export async function changePassword(
  input: z.infer<typeof changePasswordSchema>
): Promise<SettingsResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Sesi berakhir, silakan login ulang" };

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true, isActive: true },
  });
  if (!user || !user.isActive) {
    return { ok: false, error: "Akun tidak ditemukan atau nonaktif" };
  }

  const ok = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash
  );
  if (!ok) return { ok: false, error: "Password saat ini salah" };

  try {
    const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newHash },
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Gagal menyimpan password baru",
    };
  }

  return { ok: true };
}
