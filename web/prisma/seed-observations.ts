/**
 * Seed data observasi bulan berjalan untuk SEMUA indikator aktif.
 *
 * Tujuan: supaya dashboard admin & tiap unit menunjukkan pencapaian
 * yang realistis (bukan 0% di mana-mana), mengikuti pola yang sudah
 * ada di FARMASI.
 *
 * Usage:
 *   npx tsx prisma/seed-observations.ts
 *
 * Idempoten: kalau sudah ada observasi di (indicatorId, date), skip.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Deterministic PRNG supaya hasil seed reproducible
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260807);
const randInt = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;

async function main() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const today = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lastDay = Math.min(today, daysInMonth);

  console.log(
    `🌱 Seeding observasi: 1..${lastDay} ${now.toLocaleString("id-ID", {
      month: "long",
      year: "numeric",
    })}\n`
  );

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (!admin) {
    throw new Error("User ADMIN tidak ditemukan. Jalankan `db:seed` dulu.");
  }
  const createdBy = admin.id;

  const indicators = await prisma.indicator.findMany({
    where: { isActive: true },
    include: { unit: true },
    orderBy: [{ unit: { orderNo: "asc" } }, { orderNo: "asc" }],
  });

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const ind of indicators) {
    const target = Number(ind.targetPct);
    const isInverse = target === 0;

    // Cek observasi yang sudah ada untuk indikator ini di bulan ini
    const existing = await prisma.observation.findMany({
      where: {
        indicatorId: ind.id,
        observationDate: {
          gte: new Date(Date.UTC(year, month, 1)),
          lt: new Date(Date.UTC(year, month + 1, 1)),
        },
      },
      select: { observationDate: true },
    });
    const existingDates = new Set(
      existing.map((o) => o.observationDate.toISOString().slice(0, 10))
    );

    let created = 0;
    let skipped = 0;

    for (let day = 1; day <= lastDay; day++) {
      const dateIso = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
      if (existingDates.has(dateIso)) {
        skipped++;
        continue;
      }

      // Weekend (Sabtu/Minggu) — beban lebih ringan
      const dow = new Date(Date.UTC(year, month, day)).getUTCDay();
      const isWeekend = dow === 0 || dow === 6;
      const volumeMult = isWeekend ? 0.4 : 1;

      let numerator: number;
      let denominator: number;

      if (isInverse) {
        // Indikator inverse: target 0% — angka kejadian harus rendah.
        // Pembilang = jumlah kasus insiden, penyebut = total volume.
        denominator = Math.max(
          5,
          Math.round(randInt(8, 25) * volumeMult)
        );
        // Sebagian besar hari 0-2 insiden, kadang 3-4
        numerator = rand() < 0.6 ? 0 : randInt(1, Math.min(4, denominator));
      } else {
        // Indikator normal: target ≥ X% (umumnya 100).
        // Penyebut bervariasi per indikator & hari; pembilang sedikit di bawah.
        const baseDen = randInt(12, 35);
        denominator = Math.max(5, Math.round(baseDen * volumeMult));
        // Achievement antara 70-99% supaya terlihat gerak di chart
        const achievement = 0.7 + rand() * 0.28;
        numerator = Math.round(denominator * achievement);
      }

      const obsDate = new Date(Date.UTC(year, month, day));
      await prisma.observation.create({
        data: {
          indicatorId: ind.id,
          unitId: ind.unitId,
          observationDate: obsDate,
          numeratorValue: numerator,
          denominatorValue: denominator,
          createdById: createdBy,
        },
      });
      created++;
      totalCreated++;
    }

    totalSkipped += skipped;
    const coveragePct =
      lastDay > 0 ? Math.round(((created + skipped) / lastDay) * 100) : 0;
    console.log(
      `  ✓ [${ind.unit.code}] ${ind.category} ${ind.code} — +${created} obs (${coveragePct}% hari tercakup), skip ${skipped}`
    );
  }

  console.log(`\n✅ Selesai. Dibuat ${totalCreated} observasi, skip ${totalSkipped} (sudah ada).`);
}

main()
  .catch((e) => {
    console.error("❌ Seed gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
