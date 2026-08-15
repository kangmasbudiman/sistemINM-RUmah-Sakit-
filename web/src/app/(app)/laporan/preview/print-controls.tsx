"use client";

import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function PrintControls() {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5 print:hidden">
      <Link
        href="/laporan"
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Laporan
      </Link>
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-slate-500 sm:inline">
          Tip: Pilih <span className="font-semibold">"Save as PDF"</span> di dialog cetak untuk download
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Printer className="h-4 w-4" />
          Cetak / Save PDF
        </button>
      </div>
    </div>
  );
}
