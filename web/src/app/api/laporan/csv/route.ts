import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ALL_UNITS_ROLES } from "@/lib/auth-helpers";

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const allowed = ["ADMIN", "KOMITE_MUTU", "DIREKTUR", "VALIDATOR", "PIC_UNIT"];
  if (!allowed.includes(session.user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = req.nextUrl;
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));
  const category = (url.searchParams.get("category") as "INM" | "IMP" | "IMP_RS" | "IMK" | "ALL") ?? "ALL";
  const statusFilter = url.searchParams.get("status") ?? "";
  const unitCode = url.searchParams.get("unit");

  if (!year || !month) {
    return NextResponse.json(
      { error: "year dan month wajib diisi" },
      { status: 400 }
    );
  }

  const isAllUnits = (ALL_UNITS_ROLES as readonly string[]).includes(
    session.user.role
  );

  const units = await prisma.unit.findMany();
  let unitFilterId: string | undefined;
  if (isAllUnits && unitCode) {
    unitFilterId = units.find((u) => u.code === unitCode)?.id;
  } else if (!isAllUnits) {
    unitFilterId = session.user.unitId ?? undefined;
  }

  const where: Record<string, unknown> = {
    periodYear: year,
    periodMonth: month,
  };
  if (category !== "ALL") where.indicator = { category };
  if (unitFilterId) where.unitId = unitFilterId;
  if (statusFilter) where.status = statusFilter;

  const [analyses, indicators] = await Promise.all([
    prisma.analysis.findMany({
      where,
      include: {
        indicator: { include: { unit: true } },
        approvedBy: { select: { name: true } },
        validatedBy: { select: { name: true } },
      },
      orderBy: [
        { indicator: { unit: { orderNo: "asc" } } },
        { indicator: { orderNo: "asc" } },
      ],
    }),
    prisma.indicator.findMany({
      where: {
        ...(category !== "ALL" ? { category } : {}),
        ...(unitFilterId ? { unitId: unitFilterId } : {}),
        isActive: true,
      },
      include: { unit: true },
      orderBy: [{ unit: { orderNo: "asc" } }, { orderNo: "asc" }],
    }),
  ]);

  const indicatorIds = [
    ...new Set([
      ...analyses.map((a) => a.indicatorId),
      ...indicators.map((i) => i.id),
    ]),
  ];
  const observations = indicatorIds.length
    ? await prisma.observation.findMany({
        where: {
          indicatorId: { in: indicatorIds },
          observationDate: {
            gte: new Date(Date.UTC(year, month - 1, 1)),
            lt: new Date(Date.UTC(year, month, 1)),
          },
        },
        select: {
          indicatorId: true,
          numeratorValue: true,
          denominatorValue: true,
        },
      })
    : [];

  const obsByIndicator = new Map<string, { n: number; d: number }>();
  for (const o of observations) {
    const cur = obsByIndicator.get(o.indicatorId) ?? { n: 0, d: 0 };
    cur.n += o.numeratorValue;
    cur.d += o.denominatorValue;
    obsByIndicator.set(o.indicatorId, cur);
  }

  const analysisByIndicator = new Map(analyses.map((a) => [a.indicatorId, a]));

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  // Build CSV
  const header = [
    "Unit Code",
    "Unit Name",
    "Kategori",
    "Kode Indikator",
    "Judul Indikator",
    "Label Pembilang",
    "Label Penyebut",
    "Pembilang",
    "Penyebut",
    "Pencapaian (%)",
    "Target (%)",
    "Inverse (lower is better)",
    "Tercapai",
    "Status Analisa",
    "Tervalidasi (Y/N)",
    "Validator",
    "Tanggal Validasi",
    "Disetujui (Y/N)",
    "Approver (Komite Mutu)",
    "Tanggal Approval",
    "Data Collector",
    "PIC",
    "Analisa Text",
    "PDSA - Plan",
    "PDSA - Do",
    "PDSA - Study",
    "PDSA - Act",
  ];

  const lines: string[] = [];

  // Document title row
  lines.push(`# Laporan Indikator Mutu RS Royal Prima Jambi`);
  lines.push(`# Periode: ${monthNames[month - 1]} ${year}`);
  lines.push(`# Kategori: ${category === "ALL" ? "INM + IMP Unit + IMP RS + IMK" : category === "IMP_RS" ? "IMP RS" : category === "IMK" ? "IMK" : category}`);
  lines.push(
    `# Unit: ${
      unitCode
        ? units.find((u) => u.code === unitCode)?.name ?? "Semua"
        : isAllUnits
        ? "Semua Unit"
        : session.user.unitName ?? "Unit Sendiri"
    }`
  );
  lines.push(`# Di-generate oleh: ${session.user.name} (${session.user.email}) pada ${new Date().toISOString()}`);
  lines.push("");

  lines.push(header.map(escapeCsv).join(","));

  for (const indId of indicatorIds) {
    const ind = indicators.find((i) => i.id === indId)
      ?? analyses.find((a) => a.indicatorId === indId)!.indicator;
    const obs = obsByIndicator.get(indId) ?? { n: 0, d: 0 };
    const a = analysisByIndicator.get(indId);
    const pct = obs.d > 0 ? Number(((obs.n / obs.d) * 100).toFixed(2)) : 0;
    const target = Number(ind.targetPct);
    const isInverse = target === 0;
    const achieved = isInverse ? obs.d === 0 || obs.n === 0 : obs.d > 0 && pct >= target;

    const row = [
      ind.unit.code,
      ind.unit.name,
      ind.category,
      ind.code,
      ind.title,
      ind.numeratorLabel,
      ind.denominatorLabel,
      obs.n,
      obs.d,
      obs.d > 0 ? pct : "",
      isInverse ? "0 (lower is better)" : target,
      isInverse ? "Y" : "N",
      obs.d === 0 ? "No Data" : achieved ? "Y" : "N",
      a?.status ?? "DRAFT",
      a?.validatedBy?.name ? "Y" : "N",
      a?.validatedBy?.name ?? "",
      a?.validatedAt ? new Date(a.validatedAt).toISOString() : "",
      a?.status === "APPROVED" ? "Y" : "N",
      a?.approvedBy?.name ?? "",
      a?.approvedAt ? new Date(a.approvedAt).toISOString() : "",
      a?.dataCollector ?? "",
      a?.picName ?? "",
      a?.analisaText ?? "",
      a?.pdsaPlan ?? "",
      a?.pdsaDo ?? "",
      a?.pdsaStudy ?? "",
      a?.pdsaAct ?? "",
    ];
    lines.push(row.map(escapeCsv).join(","));
  }

  // Summary row
  lines.push("");
  const totalIndicators = indicatorIds.length;
  const totalAchieved = indicatorIds.filter((id) => {
    const ind = indicators.find((i) => i.id === id) ?? analyses.find((a) => a.indicatorId === id)!.indicator;
    const obs = obsByIndicator.get(id) ?? { n: 0, d: 0 };
    const target = Number(ind.targetPct);
    const isInverse = target === 0;
    const pct = obs.d > 0 ? (obs.n / obs.d) * 100 : 0;
    return isInverse ? obs.d === 0 || obs.n === 0 : obs.d > 0 && pct >= target;
  }).length;
  lines.push(`# Ringkasan: ${totalAchieved}/${totalIndicators} tercapai (${totalIndicators > 0 ? Math.round((totalAchieved / totalIndicators) * 100) : 0}%)`);

  const csv = lines.join("\r\n");

  // BOM for Excel UTF-8 compatibility
  const csvWithBom = "﻿" + csv;

  const filename = `Laporan-INM-RS-${year}-${String(month).padStart(2, "0")}.csv`;

  return new NextResponse(csvWithBom, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
