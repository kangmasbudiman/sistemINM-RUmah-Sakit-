"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

export type UserResult =
  | { ok: true }
  | { ok: false; error: string };

const roleEnum = z.enum([
  "ADMIN",
  "KOMITE_MUTU",
  "DIREKTUR",
  "PIC_UNIT",
  "DATA_COLLECTOR",
  "VALIDATOR",
]);

const baseFields = {
  name: z.string().min(1, "Nama wajib diisi").max(120),
  email: z.string().email().max(120),
  role: roleEnum,
  nik: z.string().max(32).optional().or(z.literal("")),
  gelar: z.string().max(64).optional().or(z.literal("")),
  unitId: z.string().cuid().optional().or(z.literal("")),
  isActive: z.boolean(),
};

const createSchema = z.object({
  ...baseFields,
  password: z.string().min(6, "Password minimal 6 karakter").max(120),
});

const updateSchema = z.object({
  ...baseFields,
  password: z.string().min(6).max(120).optional().or(z.literal("")),
});

function deriveUnitId(role: string, unitId: string | undefined): string | null {
  // ADMIN/KOMITE_MUTU/DIREKTUR are cross-unit; clear unitId for those roles
  const allUnitsRoles = ["ADMIN", "KOMITE_MUTU", "DIREKTUR"];
  if (allUnitsRoles.includes(role)) return null;
  return unitId || null;
}

async function assertAdmin() {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return { error: "Hanya ADMIN yang dapat mengelola user" as const, user: null };
  }
  return { error: null, user: s.user };
}

export async function createUser(
  input: z.infer<typeof createSchema>
): Promise<UserResult> {
  const { error, user } = await assertAdmin();
  if (error || !user) return { ok: false, error };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const { name, email, role, nik, gelar, isActive, password } = parsed.data;
  const unitId = deriveUnitId(role, parsed.data.unitId);

  if (role !== "ADMIN" && role !== "KOMITE_MUTU" && role !== "DIREKTUR" && !unitId) {
    return { ok: false, error: "Unit wajib dipilih untuk PIC_UNIT/DATA_COLLECTOR/VALIDATOR" };
  }

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "Email sudah terdaftar" };

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        role,
        nik: nik || null,
        gelar: gelar || null,
        unitId,
        isActive,
        passwordHash,
      },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal membuat user" };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateUser(
  id: string,
  input: z.infer<typeof updateSchema>
): Promise<UserResult> {
  const { error, user } = await assertAdmin();
  if (error || !user) return { ok: false, error };

  const idParsed = z.string().cuid().safeParse(id);
  if (!idParsed.success) return { ok: false, error: "ID tidak valid" };

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const { name, email, role, nik, gelar, isActive, password } = parsed.data;
  const unitId = deriveUnitId(role, parsed.data.unitId);

  if (role !== "ADMIN" && role !== "KOMITE_MUTU" && role !== "DIREKTUR" && !unitId) {
    return { ok: false, error: "Unit wajib dipilih untuk PIC_UNIT/DATA_COLLECTOR/VALIDATOR" };
  }

  // Prevent self-deactivation / self-lockout
  if (id === user.id && (!isActive || role !== "ADMIN")) {
    return { ok: false, error: "Tidak dapat mengubah role/menonaktifkan akun sendiri" };
  }

  const clash = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), NOT: { id } },
    select: { id: true },
  });
  if (clash) return { ok: false, error: "Email sudah dipakai user lain" };

  try {
    const data: Record<string, unknown> = {
      name,
      email: email.toLowerCase(),
      role,
      nik: nik || null,
      gelar: gelar || null,
      unitId,
      isActive,
    };
    if (password && password.length > 0) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }
    await prisma.user.update({ where: { id }, data });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal update user" };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteUser(id: string): Promise<UserResult> {
  const { error, user } = await assertAdmin();
  if (error || !user) return { ok: false, error };

  const idParsed = z.string().cuid().safeParse(id);
  if (!idParsed.success) return { ok: false, error: "ID tidak valid" };

  if (id === user.id) {
    return { ok: false, error: "Tidak dapat menghapus akun sendiri" };
  }

  try {
    await prisma.user.delete({ where: { id } });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menghapus user" };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}
