"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

type MenuProps = {
  trigger: ReactElement;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
};

/**
 * Lightweight popover menu: clones the trigger to toggle open, closes on
 * outside click or Escape. Children is a render-prop receiving `close`.
 */
export function Menu({ trigger, children, align = "right" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const clonedTrigger = isValidElement(trigger)
    ? cloneElement(trigger as ReactElement<{ onClick?: (e: unknown) => void }>, {
        onClick: (e: unknown) => {
          (e as Event).stopPropagation?.();
          setOpen((o) => !o);
        },
      })
    : trigger;

  return (
    <div ref={containerRef} className="relative inline-flex">
      {clonedTrigger}
      {open && (
        <div
          className={`absolute top-full z-30 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-surface-sunken bg-surface py-1 shadow-card-hover ${
            align === "right" ? "right-0" : "left-0"
          }`}
          role="menu"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  onClick,
  children,
  danger,
}: {
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-surface-muted ${
        danger ? "text-red-600 hover:bg-red-50" : "text-ink-soft"
      }`}
    >
      {children}
    </button>
  );
}
