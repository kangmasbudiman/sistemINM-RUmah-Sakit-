"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const loginSettingsSchema = z.object({
  brandIcon: z.string().min(1).max(64),
  brandTitle: z.string().min(1).max(120),
  brandSubtitle: z.string().max(180).or(z.literal("")),
  sideImageUrl: z.string().max(500).or(z.literal("")),
  sideBadge: z.string().max(80).or(z.literal("")),
  sideHeadline: z.string().max(180).or(z.literal("")),
  sideParagraph: z.string().max(500).or(z.literal("")),
  sideBullet1: z.string().max(160).or(z.literal("")),
  sideBullet2: z.string().max(160).or(z.literal("")),
  sideBullet3: z.string().max(160).or(z.literal("")),
  welcomeTitle: z.string().min(1).max(120),
  welcomeSubtitle: z.string().max(180).or(z.literal("")),
  footerText: z.string().max(160).or(z.literal("")),
});

export type LoginSettingsResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveLoginSettings(
  input: z.infer<typeof loginSettingsSchema>
): Promise<LoginSettingsResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { ok: false, error: "Hanya ADMIN yang dapat mengubah pengaturan ini" };
  }

  const parsed = loginSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Input tidak valid",
    };
  }
  const data = parsed.data;
  const sideImageUrl = data.sideImageUrl?.trim() ? data.sideImageUrl.trim() : null;

  try {
    await prisma.siteSetting.upsert({
      where: { id: "singleton" },
      update: {
        brandIcon: data.brandIcon,
        brandTitle: data.brandTitle,
        brandSubtitle: data.brandSubtitle,
        sideImageUrl,
        sideBadge: data.sideBadge,
        sideHeadline: data.sideHeadline,
        sideParagraph: data.sideParagraph,
        sideBullet1: data.sideBullet1,
        sideBullet2: data.sideBullet2,
        sideBullet3: data.sideBullet3,
        welcomeTitle: data.welcomeTitle,
        welcomeSubtitle: data.welcomeSubtitle,
        footerText: data.footerText,
      },
      create: {
        id: "singleton",
        brandIcon: data.brandIcon,
        brandTitle: data.brandTitle,
        brandSubtitle: data.brandSubtitle,
        sideImageUrl,
        sideBadge: data.sideBadge,
        sideHeadline: data.sideHeadline,
        sideParagraph: data.sideParagraph,
        sideBullet1: data.sideBullet1,
        sideBullet2: data.sideBullet2,
        sideBullet3: data.sideBullet3,
        welcomeTitle: data.welcomeTitle,
        welcomeSubtitle: data.welcomeSubtitle,
        footerText: data.footerText,
      },
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan" };
  }

  revalidatePath("/login");
  revalidatePath("/admin/login-settings");
  return { ok: true };
}
