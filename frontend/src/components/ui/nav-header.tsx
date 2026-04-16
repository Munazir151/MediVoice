"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type CursorPosition = {
  left: number;
  width: number;
  opacity: number;
};

type NavHeaderItem = {
  label: string;
  href: string;
};

type NavHeaderProps = {
  items?: NavHeaderItem[];
  className?: string;
};

type TabProps = {
  item: NavHeaderItem;
  setPosition: React.Dispatch<React.SetStateAction<CursorPosition>>;
  isActive: boolean;
};

type CursorProps = {
  position: CursorPosition;
};

const DEFAULT_ITEMS: NavHeaderItem[] = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features" },
  { label: "About", href: "/about" },
  { label: "Support", href: "/support" },
];

function NavHeader({ items = DEFAULT_ITEMS, className }: NavHeaderProps) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState<CursorPosition>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const syncCursorToActive = useCallback(() => {
    if (!containerRef.current) return;

    const activeTab =
      (containerRef.current.querySelector('[data-active="true"]') as HTMLLIElement | null) ??
      (containerRef.current.querySelector('[data-tab="true"]') as HTMLLIElement | null);

    if (!activeTab) return;

    const { width } = activeTab.getBoundingClientRect();
    setPosition({
      width,
      opacity: 1,
      left: activeTab.offsetLeft,
    });
  }, []);

  useEffect(() => {
    syncCursorToActive();
  }, [pathname, items, syncCursorToActive]);

  return (
    <ul
      ref={containerRef}
      className={cn(
        "relative mx-auto flex w-fit rounded-full border border-white/10 bg-background/50 p-1",
        className
      )}
      onMouseLeave={syncCursorToActive}
    >
      {items.map((item) => (
        <Tab
          key={item.href}
          item={item}
          setPosition={setPosition}
          isActive={pathname === item.href}
        />
      ))}

      <Cursor position={position} />
    </ul>
  );
}

const Tab = ({ item, setPosition, isActive }: TabProps) => {
  const ref = useRef<HTMLLIElement>(null);

  return (
    <li
      ref={ref}
      data-tab="true"
      data-active={isActive ? "true" : "false"}
      onMouseEnter={() => {
        if (!ref.current) return;

        const { width } = ref.current.getBoundingClientRect();
        setPosition({
          width,
          opacity: 1,
          left: ref.current.offsetLeft,
        });
      }}
      className="relative z-10"
    >
      <Link
        href={item.href}
        className={cn(
          "block min-w-[108px] rounded-full px-6 py-2 text-center text-sm font-medium tracking-wide transition-colors",
          isActive ? "text-primary" : "text-foreground/70 hover:text-primary"
        )}
      >
        {item.label}
      </Link>
    </li>
  );
};

const Cursor = ({ position }: CursorProps) => {
  return (
    <motion.li
      animate={position}
      className="absolute z-0 h-9 rounded-full border border-primary/20 bg-primary/10"
    />
  );
};

export default NavHeader;
