"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, FileWarning, Hourglass, Inbox, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

type AppNotification = {
  id: string;
  type: "PENDING_APPROVAL" | "PENDING_VALIDATION" | "REJECTED" | "NO_DATA";
  title: string;
  description: string;
  href: string;
  tone: "amber" | "sky" | "red" | "slate";
};

const READ_KEY = "inm-notif-read";

function getReadIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

const TYPE_ICON: Record<AppNotification["type"], React.ComponentType<{ className?: string }>> = {
  PENDING_APPROVAL: Hourglass,
  PENDING_VALIDATION: ShieldQuestion,
  REJECTED: FileWarning,
  NO_DATA: Inbox,
};

const TONE_CLASSES: Record<AppNotification["tone"], string> = {
  amber: "bg-amber-50 text-amber-600",
  sky: "bg-sky-50 text-sky-600",
  red: "bg-red-50 text-red-600",
  slate: "bg-slate-100 text-slate-600",
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { notifications: AppNotification[] };
      setItems(data.notifications);
    } catch {
      // silent — badge just stays stale until next poll
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setReadIds(getReadIds());
    fetchNotifs();
    const t = setInterval(fetchNotifs, 60_000);
    return () => clearInterval(t);
  }, [fetchNotifs]);

  // Close dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const unread = items.filter((n) => !readIds.has(n.id));
  const unreadCount = unread.length;

  function markAllRead() {
    const next = new Set([...readIds, ...items.map((n) => n.id)]);
    setReadIds(next);
    localStorage.setItem(READ_KEY, JSON.stringify([...next]));
  }

  function handleClick(n: AppNotification) {
    const next = new Set(readIds);
    next.add(n.id);
    setReadIds(next);
    localStorage.setItem(READ_KEY, JSON.stringify([...next]));
    setOpen(false);
    router.push(n.href);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative grid size-12 cursor-pointer place-items-center rounded-full border bg-gray-2 text-dark outline-none hover:text-primary focus-visible:border-primary focus-visible:text-primary dark:border-dark-4 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3 dark:focus-visible:border-primary"
        aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ""}`}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-5 text-white ring-2 ring-white dark:ring-gray-dark">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-stroke px-4 py-3 dark:border-dark-3">
            <span className="text-sm font-semibold text-dark dark:text-white">
              Notifikasi
              {unreadCount > 0 && (
                <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                  {unreadCount} baru
                </span>
              )}
            </span>
            {items.length > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <CheckCheck className="size-3.5" />
                Tandai dibaca
              </button>
            )}
          </div>

          <div className="custom-scrollbar max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-xs text-slate-500">
                Memuat notifikasi...
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-500">
                Tidak ada notifikasi. Semua beres!
              </div>
            ) : (
              <ul className="divide-y divide-stroke dark:divide-dark-3">
                {items.map((n) => {
                  const Icon = TYPE_ICON[n.type];
                  const isUnread = !readIds.has(n.id);
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => handleClick(n)}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-2 dark:hover:bg-dark-3",
                          isUnread && "bg-primary/[0.04]"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg",
                            TONE_CLASSES[n.tone]
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-dark dark:text-white">
                            {n.title}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-gray-6 dark:text-dark-6">
                            {n.description}
                          </span>
                        </span>
                        {isUnread && (
                          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
