import { auth } from "@/auth";

export const ALL_UNITS_ROLES = ["ADMIN", "KOMITE_MUTU", "DIREKTUR"] as const;

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  unitId: string | null;
  unitCode: string | null;
  unitName: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const s = await auth();
  if (!s?.user) return null;
  return s.user as SessionUser;
}

export function canManageAll(user: SessionUser | null): boolean {
  return user?.role === "ADMIN" || user?.role === "KOMITE_MUTU";
}

export function canInputData(user: SessionUser | null): boolean {
  return (
    canManageAll(user) ||
    user?.role === "PIC_UNIT" ||
    user?.role === "DATA_COLLECTOR"
  );
}

export function canApprove(user: SessionUser | null): boolean {
  return user?.role === "ADMIN" || user?.role === "KOMITE_MUTU";
}

/** VALIDATOR (Kepala Ruangan) dapat memvalidasi laporan unit-nya. ADMIN juga bisa. */
export function canValidate(user: SessionUser | null): boolean {
  return user?.role === "ADMIN" || user?.role === "VALIDATOR";
}

export function canSubmitAnalysis(user: SessionUser | null): boolean {
  return user?.role !== "DATA_COLLECTOR" && user?.role !== "DIREKTUR";
}
