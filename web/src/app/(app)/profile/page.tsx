import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileView } from "./profile-view";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  KOMITE_MUTU: "Komite Mutu",
  DIREKTUR: "Direktur",
  PIC_UNIT: "PIC Unit",
  DATA_COLLECTOR: "Data Collector",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user, counts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: { unit: true },
    }),
    Promise.all([
      prisma.observation.count({ where: { createdById: session.user.id } }),
      prisma.analysis.count({
        where: {
          OR: [
            { approvedById: session.user.id },
            { status: "SUBMITTED" },
          ],
        },
      }),
    ]),
  ]);

  if (!user) redirect("/login");

  const safeUser = {
    name: user.name,
    email: user.email,
    role: ROLE_LABELS[user.role] ?? user.role,
    nik: user.nik ?? null,
    gelar: user.gelar ?? null,
    unitCode: user.unit?.code ?? null,
    unitName: user.unit?.name ?? null,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };

  const [observationCount, analysisTouched] = counts;

  return (
    <ProfileView
      user={safeUser}
      observationCount={observationCount}
      analysisTouched={analysisTouched}
    />
  );
}
