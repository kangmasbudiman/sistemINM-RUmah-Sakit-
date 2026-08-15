export const EDIT_WINDOW_DAYS = 7;

const TZ = "Asia/Jakarta";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function todayPartsInWIB(): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const lookup: Record<string, number> = {};
  for (const p of parts) lookup[p.type] = Number(p.value);
  return { year: lookup.year, month: lookup.month, day: lookup.day };
}

export function todayYmd(): string {
  const { year, month, day } = todayPartsInWIB();
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function diffDaysFromToday(ymd: string, today: string): number {
  const a = new Date(`${ymd}T00:00:00.000Z`).getTime();
  const b = new Date(`${today}T00:00:00.000Z`).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export function isDayEditable(
  year: number,
  month: number,
  day: number,
  today: string
): boolean {
  const ymd = `${year}-${pad(month)}-${pad(day)}`;
  const diff = diffDaysFromToday(ymd, today);
  return diff >= 0 && diff < EDIT_WINDOW_DAYS;
}
