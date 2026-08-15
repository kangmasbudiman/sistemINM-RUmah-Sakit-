"use client";

import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  KOMITE_MUTU: "Komite Mutu",
  DIREKTUR: "Direktur",
  PIC_UNIT: "PIC Unit",
  DATA_COLLECTOR: "Data Collector",
};

export function UserInfo({
  user,
}: {
  user: {
    name?: string | null;
    email?: string | null;
    role: string;
  };
}) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  function initials(name?: string | null) {
    if (!name) return "?";
    return name
      .split(" ")
      .slice(0, 2)
      .map((s) => s[0])
      .join("")
      .toUpperCase();
  }

  async function handleLogout() {
    setIsOpen(false);
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger className="group cursor-pointer rounded-full align-middle outline-0 ring-primary ring-offset-2 focus-visible:ring-1 dark:ring-offset-gray-dark">
        <span className="sr-only">Akun saya</span>
        <figure className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-full border bg-gray-2 text-sm font-bold text-dark dark:border-dark-4 dark:bg-dark-2 dark:text-white">
            {initials(user.name)}
          </span>
          <figcaption className="flex items-center gap-1 font-medium text-dark max-[1024px]:sr-only dark:text-white">
            <span className="max-w-24 truncate">{user.name}</span>
            <ChevronDown
              aria-hidden
              className={cn(
                "size-4 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </figcaption>
        </figure>
      </DropdownTrigger>

      <DropdownContent
        align="end"
        className="min-w-72 border border-stroke bg-white shadow-card-2 dark:border-dark-3 dark:bg-gray-dark"
      >
        <figure className="flex items-center gap-2.5 px-5 py-3.5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full border bg-gray-2 text-sm font-bold text-dark dark:border-dark-4 dark:bg-dark-2 dark:text-white">
            {initials(user.name)}
          </span>
          <figcaption className="space-y-1 text-base font-medium">
            <div className="mb-2 leading-none text-dark dark:text-white">
              {user.name}
            </div>
            <div className="w-full max-w-47.5 truncate leading-none text-gray-6">
              {user.email}
            </div>
            <div className="text-xs text-primary">
              {ROLE_LABELS[user.role] ?? user.role}
            </div>
          </figcaption>
        </figure>

        <hr className="border-stroke dark:border-dark-3" />

        <div className="p-2 text-base text-dark-4 dark:text-dark-6">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              router.push("/profile");
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2.25 outline-0 hover:bg-gray-2 hover:text-dark focus-visible:ring-1 dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <User className="size-5" />
            <span className="mr-auto text-sm font-medium">Profil</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              router.push("/settings");
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2.25 outline-0 hover:bg-gray-2 hover:text-dark focus-visible:ring-1 dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <Settings className="size-5" />
            <span className="mr-auto text-sm font-medium">Pengaturan</span>
          </button>
        </div>

        <hr className="border-stroke dark:border-dark-3" />

        <div className="p-2">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2.25 text-red outline-0 hover:bg-red-light-6 focus-visible:ring-1 dark:hover:bg-dark-3"
          >
            <LogOut className="size-5" />
            <span className="text-sm font-medium">Keluar</span>
          </button>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}
