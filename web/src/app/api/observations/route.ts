import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ALL_UNITS_ROLES } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl;
  const indicatorId = url.searchParams.get("indicatorId");
  const year = Number(url.searchParams.get("year"));
  const month = Number(url.searchParams.get("month"));

  if (!indicatorId || !year || !month) {
    return NextResponse.json(
      { error: "indicatorId, year, month required" },
      { status: 400 }
    );
  }

  const indicator = await prisma.indicator.findUnique({
    where: { id: indicatorId },
    select: { id: true, unitId: true },
  });
  if (!indicator) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const isAllUnits = (ALL_UNITS_ROLES as readonly string[]).includes(
    session.user.role
  );
  if (!isAllUnits && indicator.unitId !== session.user.unitId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const observations = await prisma.observation.findMany({
    where: {
      indicatorId,
      observationDate: {
        gte: new Date(Date.UTC(year, month - 1, 1)),
        lt: new Date(Date.UTC(year, month, 1)),
      },
    },
    select: {
      observationDate: true,
      numeratorValue: true,
      denominatorValue: true,
    },
  });

  return NextResponse.json(
    observations.map((o) => ({
      observationDate: o.observationDate.toISOString(),
      numeratorValue: o.numeratorValue,
      denominatorValue: o.denominatorValue,
    }))
  );
}
