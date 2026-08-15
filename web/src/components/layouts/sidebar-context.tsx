"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { createContext, useContext, useEffect, useState } from "react";

type SidebarContextType = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export function useSidebarContext() {
  const ctx = useContext(SidebarContext);
  if (!ctx)
    throw new Error("useSidebarContext must be used within SidebarProvider");
  return ctx;
}

export function SidebarProvider({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isMobile = useIsMobile();

  // Auto-collapse on mobile, expand on desktop
  useEffect(() => {
    setIsOpen(!isMobile);
  }, [isMobile]);

  function toggleSidebar() {
    setIsOpen((prev) => !prev);
  }

  return (
    <SidebarContext.Provider
      value={{ isOpen, setIsOpen, isMobile, toggleSidebar }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
