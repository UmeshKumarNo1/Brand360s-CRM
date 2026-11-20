"use client";

import { useEffect, useState, useRef, ReactNode } from "react";
import { createPortal } from "react-dom";

interface PortalDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  minWidth?: number;
  align?: "right" | "left";
  lockScroll?: boolean;
}

export function PortalDropdown({
  isOpen,
  onClose,
  triggerRef,
  children,
  className = "",
  minWidth = 200,
  align = "right",
  lockScroll = false,
}: PortalDropdownProps) {
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    openUpward: boolean;
  } | null>(null);

  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) {
      setCoords(null);
      return;
    }

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Estimate menu height (~220px) or read current element if rendered
      const menuHeight = dropdownRef.current?.offsetHeight || 220;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      // If space below is less than menu height and there is more space above, open upward
      const openUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow;

      let left: number | undefined;
      let right: number | undefined;

      if (align === "left") {
        left = Math.max(8, rect.left);
        if (left + minWidth > viewportWidth - 8) {
          left = Math.max(8, viewportWidth - minWidth - 8);
        }
      } else {
        right = viewportWidth - rect.right;
        if (right < 8) right = 8;
        if (rect.right - minWidth < 8) {
          right = Math.max(8, viewportWidth - (rect.left + minWidth));
        }
      }

      if (openUpward) {
        setCoords({
          bottom: viewportHeight - rect.top + 6,
          left,
          right,
          openUpward: true,
        });
      } else {
        setCoords({
          top: rect.bottom + 6,
          left,
          right,
          openUpward: false,
        });
      }
    };

    updatePosition();

    // Re-check on scroll or resize
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, triggerRef, minWidth, align]);

  // Handle outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  // Lock background page scrolling without layout shift
  useEffect(() => {
    if (!isOpen || !lockScroll) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen, lockScroll]);

  if (!mounted || !isOpen || !coords) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: coords.top !== undefined ? `${coords.top}px` : undefined,
        bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
        left: coords.left !== undefined ? `${coords.left}px` : undefined,
        right: coords.right !== undefined ? `${coords.right}px` : undefined,
        zIndex: 9999,
        minWidth: `${minWidth}px`,
      }}
      className={`bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}

