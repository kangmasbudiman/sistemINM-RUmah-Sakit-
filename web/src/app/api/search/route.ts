import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ALL_UNITS_ROLES } from "@/lib/auth-helpers";
import { indicatorDetailPath, CATEGORY_LABEL } from "@/lib/utils";

export type SearchHit = {
  id: string;
  code: string;
  title: string;
  category: string;
  categoryLabel: string;
  unitCode: string;
  unitName: string;
  href: string;
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const user = session.user;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ hits: [] });
  }

  const isAllUnits = (ALL_UNITS_ROLES as readonly string[]).includes(user.role);
  const scope = {
    isActive: true,
    ...(isAllUnits ? {} : { unitId: user.unitId! }),
  };

  const indicators = await prisma.indicator.findMany({
    where: {
      ...scope,
      OR: [
        { code: { contains: q } },
        { title: { contains: q } },
        { numeratorLabel: { contains: q } },
        { denominatorLabel: { contains: q } },
        { unit: { code: { contains: q } } },
        { unit: { name: { contains: q } } },
      ],
    },
    include: { unit: { select: { code: true, name: true } } },
    orderBy: [{ unit: { orderNo: "asc" } }, { orderNo: "asc" }],
    take: 12,
  });

  const hits: SearchHit[] = indicators.map((i) => ({
    id: i.id,
    code: i.code,
    title: i.title,
    category: i.category,
    categoryLabel: CATEGORY_LABEL[i.category],
    unitCode: i.unit.code,
    unitName: i.unit.name,
    href: indicatorDetailPath(i.category, i.id),
  }));

  return NextResponse.json({ hits });
}
