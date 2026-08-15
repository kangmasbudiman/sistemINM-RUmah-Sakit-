import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ALL_UNITS_ROLES } from "@/lib/auth-helpers";

export type AppNotification = {
  id: string;
  type: "PENDING_APPROVAL" | "PENDING_VALIDATION" | "REJECTED" | "NO_DATA";
  title: string;
  description: string;
  href: string;
  tone: "amber" | "sky" | "red" | "slate";
};

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const user = session.user;
  const role = user.role;
  const isAllUnits = (ALL_UNITS_ROLES as readonly string[]).includes(role);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  const notifications: AppNotification[] = [];

  // ── 1. Menunggu approval (untuk approver: ADMIN/KOMITE_MUTU) ──
  if (role === "ADMIN" || role === "KOMITE_MUTU") {
    const [pendingCount, latest] = await Promise.all([
      prisma.analysis.count({ where: { status: "SUBMITTED" } }),
      prisma.analysis.findFirst({
        where: { status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        include: { indicator: { select: { code: true, title: true } } },
      }),
    ]);
    if (pendingCount > 0) {
      notifications.push({
        id: `pending-approval-${month}-${year}`,
        type: "PENDING_APPROVAL",
        title: `${pendingCount} analisa menunggu approval`,
        description: latest
          ? `Terbaru: ${latest.indicator.code} — ${latest.indicator.title.slice(0, 60)}`
          : "Perlu ditinjau Komite Mutu",
        href: "/analisa?status=SUBMITTED",
        tone: "amber",
      });
    }
  }

  // ── 2. Menunggu validasi (untuk VALIDATOR unit-nya; ADMIN semua unit) ──
  if (role === "VALIDATOR" || role === "ADMIN") {
    const unitFilter =
      role === "VALIDATOR" && user.unitId ? { unitId: user.unitId } : {};
    const pendingValidation = await prisma.analysis.count({
      where: { status: "SUBMITTED", ...unitFilter },
    });
    if (pendingValidation > 0) {
      notifications.push({
        id: `pending-validation-${month}-${year}`,
        type: "PENDING_VALIDATION",
        title: `${pendingValidation} analisa menunggu validasi`,
        description:
          role === "VALIDATOR"
            ? "Laporan unit Anda perlu dicek Kepala Ruangan"
            : "Lintas unit — dapat divalidasi atau langsung di-approve",
        href: "/analisa?status=SUBMITTED",
        tone: "sky",
      });
    }
  }

  // ── 3. Analisa ditolak (PIC_UNIT/DATA_COLLECTOR di unitnya) ──
  if ((role === "PIC_UNIT" || role === "DATA_COLLECTOR") && user.unitId) {
    const [rejectedCount, latestRejected] = await Promise.all([
      prisma.analysis.count({
        where: {
          status: "REJECTED",
          unitId: user.unitId,
          periodMonth: month,
          periodYear: year,
        },
      }),
      prisma.analysis.findFirst({
        where: {
          status: "REJECTED",
          unitId: user.unitId,
          periodMonth: month,
          periodYear: year,
        },
        orderBy: { updatedAt: "desc" },
        include: { indicator: { select: { code: true } } },
      }),
    ]);
    if (rejectedCount > 0) {
      notifications.push({
        id: `rejected-${month}-${year}`,
        type: "REJECTED",
        title: `${rejectedCount} analisa ditolak Komite Mutu`,
        description: latestRejected
          ? `Perlu revisi: ${latestRejected.indicator.code}`
          : "Perlu revisi dan re-submit",
        href: "/analisa?status=REJECTED",
        tone: "red",
      });
    }
  }

  // ── 4. Indikator belum ada data bulan ini ──
  const indicatorScope = {
    isActive: true,
    ...(isAllUnits ? {} : { unitId: user.unitId! }),
  };
  const activeIndicators = await prisma.indicator.findMany({
    where: indicatorScope,
    select: { id: true },
  });
  const ids = activeIndicators.map((i) => i.id);
  const withData = ids.length
    ? await prisma.observation.findMany({
        where: {
          indicatorId: { in: ids },
          observationDate: { gte: monthStart, lt: monthEnd },
        },
        select: { indicatorId: true },
        distinct: ["indicatorId"],
      })
    : [];
  const withDataIds = new Set(withData.map((o) => o.indicatorId));
  const noDataCount = activeIndicators.filter((i) => !withDataIds.has(i.id)).length;

  if (noDataCount > 0 && (role !== "DIREKTUR")) {
    notifications.push({
      id: `no-data-${month}-${year}`,
      type: "NO_DATA",
      title: `${noDataCount} indikator belum ada data ${month}`,
      description: isAllUnits
        ? "Lintas unit — pantau di dashboard masing-masing kategori"
        : "Unit Anda — segera input data harian",
      href: isAllUnits ? "/admin/dashboard" : "/input",
      tone: "slate",
    });
  }

  return NextResponse.json({ notifications, count: notifications.length });
}
