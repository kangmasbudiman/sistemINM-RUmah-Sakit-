"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchHit = {
  id: string;
  code: string;
  title: string;
  categoryLabel: string;
  unitCode: string;
  unitName: string;
  href: string;
};

const CAT_BADGE: Record<string, string> = {
  INM: "bg-emerald-100 text-emerald-700",
  "IMP Unit": "bg-sky-100 text-sky-700",
  "IMP RS": "bg-indigo-100 text-indigo-700",
};

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Debounced fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const query = q.trim();
    if (query.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { hits: SearchHit[] };
        setHits(data.hits);
        setOpen(true);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Cmd/Ctrl+K to focus
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function go(hit: SearchHit) {
    setOpen(false);
    setQ("");
    router.push(hit.href);
  }

  const showPanel = open && q.trim().length >= 2;

  return (
    <div ref={rootRef} className="relative w-full max-w-75">
      <input
        ref={inputRef}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q.trim().length >= 2 && setOpen(true)}
        placeholder="Cari indikator, unit... (⌘K)"
        className="flex w-full items-center gap-3.5 rounded-full border bg-gray-2 py-3 pr-5 pl-13.25 transition-colors outline-none focus-visible:border-primary dark:border-dark-3 dark:bg-dark-2 dark:hover:border-dark-4 dark:hover:bg-dark-3 dark:hover:text-dark-6 dark:focus-visible:border-primary"
      />
      {loading ? (
        <Loader2 className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 animate-spin text-gray-5" />
      ) : (
        <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-gray-5" />
      )}

      {showPanel && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2">
          {hits.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-500">
              Tidak ada hasil untuk &quot;{q.trim()}&quot;
            </div>
          ) : (
            <ul className="custom-scrollbar max-h-80 divide-y divide-stroke overflow-y-auto dark:divide-dark-3">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => go(h)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-2 dark:hover:bg-dark-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-slate-500">
                          {h.code}
                        </span>
                        <span
                          className={cn(
                            "inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold",
                            CAT_BADGE[h.categoryLabel] ??
                              "bg-slate-100 text-slate-600"
                          )}
                        >
                          {h.categoryLabel}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {h.unitCode}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs font-medium text-slate-800 dark:text-dark-6">
                        {h.title}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
