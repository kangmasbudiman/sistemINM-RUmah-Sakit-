import { prisma } from "@/lib/prisma";

/**
 * Flag pembatas jendela input harian (default: aktif — hanya EDIT_WINDOW_DAYS
 * hari terakhir yang bisa diisi). Admin bisa menonaktifkan lewat Master Data.
 */
export async function getRestrictEditWindow(): Promise<boolean> {
  const row = await prisma.siteSetting.findUnique({
    where: { id: "singleton" },
    select: { restrictEditWindow: true },
  });
  return row?.restrictEditWindow ?? true;
}
