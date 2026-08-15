"use client";

import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
} from "react";

type DropdownContextType = {
  isOpen: boolean;
  handleOpen: () => void;
  handleClose: () => void;
};

const DropdownContext = createContext<DropdownContextType | null>(null);

function useDropdownContext() {
  const ctx = useContext(DropdownContext);
  if (!ctx) throw new Error("useDropdownContext must be used within a Dropdown");
  return ctx;
}

export function Dropdown({
  children,
  isOpen,
  setIsOpen,
}: {
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
    } else {
      setTimeout(() => triggerRef.current?.focus(), 0);
    }
  }, [isOpen]);

  function handleClose() {
    setIsOpen(false);
  }
  function handleOpen() {
    setIsOpen(true);
  }

  return (
    <DropdownContext.Provider value={{ isOpen, handleOpen, handleClose }}>
      <div
        className="relative"
        onKeyDown={(e) => e.key === "Escape" && handleClose()}
      >
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownContent({
  children,
  align = "center",
  className,
}: {
  align?: "start" | "end" | "center";
  className?: string;
  children: React.ReactNode;
}) {
  const { isOpen, handleClose } = useDropdownContext();
  const contentRef = useClickOutside<HTMLDivElement>(() => {
    if (isOpen) handleClose();
  });

  if (!isOpen) return null;

  return (
    <div
      ref={contentRef}
      role="menu"
      aria-orientation="vertical"
      className={cn(
        "pointer-events-auto absolute z-99 mt-2 min-w-32 rounded-lg",
        align === "end" && "right-0",
        align === "start" && "left-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DropdownTrigger({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  const { handleOpen, isOpen } = useDropdownContext();
  return (
    <button
      type="button"
      className={className}
      onClick={handleOpen}
      aria-expanded={isOpen}
      aria-haspopup="menu"
      data-state={isOpen ? "open" : "closed"}
    >
      {children}
    </button>
  );
}
