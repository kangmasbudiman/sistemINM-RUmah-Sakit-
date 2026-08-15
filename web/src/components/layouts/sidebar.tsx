"use client";

import {
  Activity,
  ChevronRight,
  ChevronUp,
  Settings,
  Target,
  FileText,
  LineChart,
  Building2,
  Hospital,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./logo";
import { MenuItem } from "./menu-item";
import { useSidebarContext } from "./sidebar-context";
import { cn } from "@/lib/utils";

type NavLeaf = { title: string; href: string };
type NavGroup = {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: NavLeaf[];
};
type NavItem = {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  /** 1-level dropdown */
  children?: NavLeaf[];
  /** 2-level dropdown: parent → groups → leaves */
  groups?: NavGroup[];
};
type NavSection = { label: string; items: NavItem[] };

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  KOMITE_MUTU: "Komite Mutu",
  DIREKTUR: "Direktur",
  PIC_UNIT: "PIC Unit",
  DATA_COLLECTOR: "Data Collector",
  VALIDATOR: "Validator (Kepala Ruangan)",
};

function buildNav(role: string): NavSection[] {
  const inm: NavItem = {
    title: "INM",
    icon: Activity,
    children: [
      { title: "Dashboard", href: "/dashboard" },
      { title: "Indikator", href: "/indikator" },
      { title: "Input Harian", href: "/input" },
      { title: "Analisa Bulanan", href: "/analisa" },
    ],
  };

  const imp: NavItem = {
    title: "IMP",
    icon: Target,
    groups: [
      {
        title: "IMP Unit",
        icon: Building2,
        children: [
          { title: "Dashboard", href: "/imp/dashboard" },
          { title: "Indikator", href: "/imp/indikator" },
          { title: "Input Harian", href: "/imp/input" },
          { title: "Analisa Bulanan", href: "/imp/analisa" },
        ],
      },
      {
        title: "IMP RS",
        icon: Hospital,
        children: [
          { title: "Dashboard", href: "/imp-rs/dashboard" },
          { title: "Indikator", href: "/imp-rs/indikator" },
          { title: "Input Harian", href: "/imp-rs/input" },
          { title: "Analisa Bulanan", href: "/imp-rs/analisa" },
        ],
      },
    ],
  };

  const admin: NavItem = {
    title: "Administrasi",
    icon: Settings,
    roles: ["ADMIN"],
    children: [
      { title: "Dashboard Utama", href: "/admin/dashboard" },
      { title: "Manajemen User", href: "/admin/users" },
      { title: "Master Data", href: "/admin/master" },
      { title: "Tampilan Login", href: "/admin/login-settings" },
    ],
  };

  const laporan: NavItem = {
    title: "Laporan Bulanan",
    href: "/laporan",
    icon: FileText,
    roles: ["ADMIN", "KOMITE_MUTU", "DIREKTUR", "VALIDATOR", "PIC_UNIT"],
  };

  const direktur: NavItem = {
    title: "Dashboard Direktur",
    href: "/direktur/dashboard",
    icon: LineChart,
    roles: ["ADMIN", "DIREKTUR"],
  };

  const sections: NavSection[] = [
    { label: "MENU UTAMA", items: [inm, imp, admin] },
    { label: "EXECUTIVE", items: [direktur] },
    { label: "LAPORAN", items: [laporan] },
  ];

  return sections
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => !i.roles || i.roles.includes(role)),
    }))
    .filter((s) => s.items.length > 0);
}

function isLeafActive(leaf: NavLeaf, pathname: string): boolean {
  return pathname === leaf.href || pathname.startsWith(leaf.href + "/");
}

export function Sidebar({
  user,
}: {
  user: {
    name?: string | null;
    email?: string | null;
    role: string;
    unitName?: string | null;
  };
}) {
  const pathname = usePathname();
  const { isOpen, setIsOpen, isMobile, toggleSidebar } = useSidebarContext();
  const [expanded, setExpanded] = useState<string[]>([]);

  const nav = buildNav(user.role);

  // Auto-expand sections/groups containing the active route
  useEffect(() => {
    setExpanded((prev) => {
      const next = [...prev];
      for (const section of nav) {
        for (const item of section.items) {
          // 1-level dropdown
          if (item.children?.some((c) => isLeafActive(c, pathname))) {
            if (!next.includes(item.title)) next.push(item.title);
          }
          // 2-level dropdown
          if (item.groups) {
            for (const grp of item.groups) {
              if (grp.children.some((c) => isLeafActive(c, pathname))) {
                if (!next.includes(item.title)) next.push(item.title);
                if (!next.includes(grp.title)) next.push(grp.title);
              }
            }
          }
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleExpand(title: string) {
    setExpanded((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  }

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "max-w-[290px] overflow-hidden border-r border-stroke bg-white transition-width duration-200 ease-linear dark:border-gray-800 dark:bg-gray-dark",
          isMobile ? "fixed bottom-0 top-0 z-50" : "sticky top-0 h-screen",
          isOpen ? "w-full" : "w-0"
        )}
        aria-label="Main navigation"
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="flex h-full flex-col pb-10 pl-[25px] pr-[7px] pt-4">
          {/* Logo */}
          <div className="pr-4.5">
            <Link
              href="/dashboard"
              onClick={() => isMobile && toggleSidebar()}
              className="block px-0 py-0"
            >
              <Logo />
            </Link>
          </div>

          {/* Navigation */}
          <div className="custom-scrollbar mt-6 flex-1 overflow-y-auto pr-3">
            {nav.map((section) => (
              <div key={section.label} className="mb-6">
                <h2 className="mb-5 text-sm font-medium text-dark-4 dark:text-dark-6">
                  {section.label}
                </h2>
                <nav aria-label={section.label}>
                  <ul className="space-y-2">
                    {section.items.map((item) => {
                      const hasGroups = !!item.groups?.length;
                      const hasChildren = !!item.children?.length;
                      const isParent =
                        hasGroups || hasChildren; /* dropdown-able */

                      const isItemActive = hasGroups
                        ? item.groups!.some((g) =>
                            g.children.some((c) => isLeafActive(c, pathname))
                          )
                        : hasChildren
                        ? item.children!.some((c) => isLeafActive(c, pathname))
                        : !!item.href &&
                          (pathname === item.href ||
                            pathname.startsWith(item.href + "/"));
                      const Icon = item.icon;

                      return (
                        <li key={item.title}>
                          {hasGroups ? (
                            // 2-level dropdown
                            <div>
                              <MenuItem
                                isActive={isItemActive}
                                onClick={() => toggleExpand(item.title)}
                              >
                                <Icon className="size-6 shrink-0" />
                                <span>{item.title}</span>
                                <ChevronUp
                                  className={cn(
                                    "ml-auto rotate-180 transition-transform duration-200",
                                    expanded.includes(item.title) && "rotate-0"
                                  )}
                                />
                              </MenuItem>
                              {expanded.includes(item.title) && (
                                <ul
                                  className="ml-6 mr-0 space-y-1 pb-2 pt-1"
                                  role="menu"
                                >
                                  {item.groups!.map((grp) => {
                                    const GroupIcon = grp.icon;
                                    const isGrpActive = grp.children.some((c) =>
                                      isLeafActive(c, pathname)
                                    );
                                    return (
                                      <li key={grp.title} role="none">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            toggleExpand(grp.title)
                                          }
                                          className={cn(
                                            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                                            isGrpActive
                                              ? "bg-primary/10 font-semibold text-primary"
                                              : "text-gray-700 hover:bg-gray-2 dark:text-dark-6 dark:hover:bg-dark-2"
                                          )}
                                        >
                                          {GroupIcon && (
                                            <GroupIcon className="size-4 shrink-0" />
                                          )}
                                          <span className="flex-1 truncate">
                                            {grp.title}
                                          </span>
                                          <ChevronRight
                                            className={cn(
                                              "size-4 shrink-0 transition-transform duration-200",
                                              expanded.includes(grp.title) &&
                                                "rotate-90"
                                            )}
                                          />
                                        </button>
                                        {expanded.includes(grp.title) && (
                                          <ul
                                            className="ml-4 mr-0 space-y-1 border-l border-stroke py-1 pl-3 dark:border-dark-3"
                                            role="menu"
                                          >
                                            {grp.children.map((sub) => (
                                              <li key={sub.href} role="none">
                                                <MenuItem
                                                  as="link"
                                                  href={sub.href}
                                                  isActive={isLeafActive(
                                                    sub,
                                                    pathname
                                                  )}
                                                >
                                                  <span>{sub.title}</span>
                                                </MenuItem>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>
                          ) : hasChildren ? (
                            // 1-level dropdown
                            <div>
                              <MenuItem
                                isActive={isItemActive}
                                onClick={() => toggleExpand(item.title)}
                              >
                                <Icon className="size-6 shrink-0" />
                                <span>{item.title}</span>
                                <ChevronUp
                                  className={cn(
                                    "ml-auto rotate-180 transition-transform duration-200",
                                    expanded.includes(item.title) && "rotate-0"
                                  )}
                                />
                              </MenuItem>
                              {expanded.includes(item.title) && (
                                <ul
                                  className="ml-9 mr-0 space-y-1.5 pb-[15px] pr-0 pt-2"
                                  role="menu"
                                >
                                  {item.children!.map((sub) => (
                                    <li key={sub.href} role="none">
                                      <MenuItem
                                        as="link"
                                        href={sub.href}
                                        isActive={isLeafActive(sub, pathname)}
                                      >
                                        <span>{sub.title}</span>
                                      </MenuItem>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ) : (
                            <MenuItem
                              as="link"
                              href={item.href!}
                              isActive={!!isItemActive}
                            >
                              <Icon className="size-6 shrink-0" />
                              <span>{item.title}</span>
                            </MenuItem>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </nav>
              </div>
            ))}
          </div>

          {/* User card */}
          <div className="mt-4 pr-4.5">
            <div className="rounded-xl bg-gray-2 p-3 dark:bg-dark-2">
              <div className="text-[11px] text-gray-6 dark:text-dark-6">
                Login sebagai
              </div>
              <div className="mt-0.5 truncate text-sm font-semibold text-dark dark:text-white">
                {user.name}
              </div>
              <div className="mt-0.5 text-xs text-gray-6 dark:text-dark-6">
                {ROLE_LABELS[user.role] ?? user.role}
              </div>
              {user.unitName && (
                <div className="mt-1 truncate text-xs font-medium text-primary">
                  {user.unitName}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
