"use client";

import { Logo } from "@/components/layouts/logo";
import { useSidebarContext } from "@/components/layouts/sidebar-context";
import { ThemeToggleSwitch } from "@/components/layouts/theme-toggle";
import { UserInfo } from "@/components/layouts/user-info";
import { GlobalSearch } from "@/components/layouts/global-search";
import { NotificationBell } from "@/components/layouts/notification-bell";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Dashboard INM",
    subtitle: "Pantau pencapaian indikator mutu nasional",
  },
  "/indikator": {
    title: "Daftar Indikator INM",
    subtitle: "Indikator Mutu Nasional per unit",
  },
  "/input": {
    title: "Input Harian INM",
    subtitle: "Pencatatan observasi harian + analisa PDSA",
  },
  "/analisa": {
    title: "Analisa Bulanan INM",
    subtitle: "Workflow submit & approval analisa",
  },
  "/imp/dashboard": {
    title: "Dashboard IMP",
    subtitle: "Pantau pencapaian indikator mutu prioritas",
  },
  "/imp/indikator": {
    title: "Daftar Indikator IMP",
    subtitle: "Indikator Mutu Prioritas per unit",
  },
  "/imp/input": {
    title: "Input Harian IMP",
    subtitle: "Pencatatan observasi harian + analisa PDSA",
  },
  "/imp/analisa": {
    title: "Analisa Bulanan IMP",
    subtitle: "Workflow submit & approval analisa",
  },
  "/imp-rs/dashboard": {
    title: "Dashboard IMP RS",
    subtitle: "Pantau pencapaian indikator mutu prioritas RS",
  },
  "/imp-rs/indikator": {
    title: "Daftar Indikator IMP RS",
    subtitle: "Indikator Mutu Prioritas RS per area",
  },
  "/imp-rs/input": {
    title: "Input Harian IMP RS",
    subtitle: "Pencatatan observasi harian + analisa PDSA",
  },
  "/imp-rs/analisa": {
    title: "Analisa Bulanan IMP RS",
    subtitle: "Workflow submit & approval analisa",
  },
  "/imk/dashboard": {
    title: "Dashboard IMK",
    subtitle: "Pantau pencapaian indikator mutu kontrak",
  },
  "/imk/indikator": {
    title: "Daftar Indikator IMK",
    subtitle: "Indikator Mutu Kontrak per unit",
  },
  "/imk/input": {
    title: "Input Harian IMK",
    subtitle: "Pencatatan observasi harian + analisa PDSA",
  },
  "/imk/analisa": {
    title: "Analisa Bulanan IMK",
    subtitle: "Workflow submit & approval analisa",
  },
  "/admin/dashboard": {
    title: "Dashboard Utama",
    subtitle: "Pantau seluruh indikator INM + IMP lintas unit",
  },
  "/admin/users": {
    title: "Manajemen User",
    subtitle: "Kelola akun, role, dan unit",
  },
  "/admin/master": {
    title: "Master Data",
    subtitle: "Kelola daftar Unit & Indikator INM/IMP",
  },
  "/admin/login-settings": {
    title: "Tampilan Login",
    subtitle: "Atur branding, gambar, dan teks halaman login",
  },
  "/direktur/dashboard": {
    title: "Dashboard Direktur",
    subtitle: "Ringkasan executive indikator mutu lintas unit",
  },
  "/laporan": {
    title: "Laporan Bulanan",
    subtitle: "Download & cetak laporan pencapaian indikator",
  },
  "/profile": {
    title: "Profil Saya",
    subtitle: "Informasi akun & aktivitas Anda",
  },
  "/settings": {
    title: "Pengaturan",
    subtitle: "Ubah password & preferensi akun",
  },
};

function resolveTitle(pathname: string) {
  const match = Object.entries(PAGE_TITLES).find(
    ([href]) => pathname === href || pathname.startsWith(href + "/")
  );
  if (match) return match[1];
  return { title: "INM RS", subtitle: "Royal Prima Jambi" };
}

export function Header({
  user,
}: {
  user: {
    name?: string | null;
    email?: string | null;
    role: string;
    unitName?: string | null;
  };
}) {
  const { toggleSidebar, isMobile } = useSidebarContext();
  const pathname = usePathname();
  const { title, subtitle } = resolveTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stroke bg-white px-4 py-4 shadow-md dark:border-stroke-dark dark:bg-gray-dark md:px-5 2xl:px-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="rounded-lg border border-stroke px-1.5 py-1 hover:bg-gray-2 dark:border-stroke-dark dark:bg-[#020D1A] dark:hover:bg-[#FFFFFF1A] lg:hidden"
        >
          <Menu className="size-6 text-dark dark:text-white" />
          <span className="sr-only">Toggle Sidebar</span>
        </button>

        {isMobile && <Logo />}

        <div className="max-xl:hidden">
          <h1 className="mb-0.5 text-2xl font-bold text-dark dark:text-white">
            {title}
          </h1>
          <p className="text-sm font-medium text-gray-6 dark:text-dark-6">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 2xsm:gap-4">
        <GlobalSearch />

        <ThemeToggleSwitch />

        <NotificationBell />

        <div className="shrink-0">
          <UserInfo user={user} />
        </div>
      </div>
    </header>
  );
}
