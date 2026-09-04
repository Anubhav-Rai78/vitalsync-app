"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Pure sliding-window algorithm — exported for testing / reuse.       */
/* ------------------------------------------------------------------ */
export function computePageWindow(
  currentPage: number,
  totalPages: number,
  maxVisiblePages: number,
): number[] {
  if (totalPages <= 0) return [];
  const clamped = Math.max(1, Math.min(currentPage, totalPages));
  const start = Math.max(
    0,
    Math.min(clamped - 1 - Math.floor(maxVisiblePages / 2), totalPages - maxVisiblePages),
  );
  const end = Math.min(start + maxVisiblePages, totalPages);
  const adjustedStart = Math.max(0, end - maxVisiblePages);
  return Array.from({ length: end - adjustedStart }, (_, i) => adjustedStart + i + 1);
}

/* ------------------------------------------------------------------ */
/*  DataPagination — a global, reusable pagination footer.              */
/* ------------------------------------------------------------------ */
export interface DataPaginationProps {
  /** Total number of items across all pages. */
  totalItems: number;
  /** 1-based active page index. */
  currentPage: number;
  /** Callback when the user clicks a page number or arrow. */
  onPageChange: (page: number) => void;
  /** Items per page (default 5). */
  pageSize?: number;
  /** Maximum visible page buttons between arrows (default 3). */
  maxVisiblePages?: number;
  /** Human label for the item type (default "entries"). */
  itemName?: string;
  /** Optional class override on the wrapper div. */
  className?: string;
}

export default function DataPagination({
  totalItems,
  currentPage,
  onPageChange,
  pageSize = 5,
  maxVisiblePages = 3,
  itemName = "entries",
  className,
}: DataPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.max(1, Math.min(currentPage, totalPages));

  const windowPages = computePageWindow(safePage, totalPages, maxVisiblePages);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  return (
    <div
      className={cn(
        "px-md py-sm border-t border-outline-variant bg-surface-container-lowest flex flex-wrap items-center justify-between gap-sm",
        className,
      )}
    >
      {/* Summary text */}
      <span className="font-body-sm text-body-sm text-on-surface-variant">
        Showing{" "}
        <span className="font-medium text-on-surface">{startItem}</span> to{" "}
        <span className="font-medium text-on-surface">{endItem}</span> of{" "}
        <span className="font-medium text-on-surface">{totalItems}</span>{" "}
        {itemName}
      </span>

      {/* Page buttons */}
      <div className="flex items-center gap-xs">
        {/* Previous */}
        <button
          onClick={() => onPageChange(Math.max(safePage - 1, 1))}
          disabled={safePage <= 1}
          className="p-1.5 border border-outline-variant rounded bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page number buttons */}
        {windowPages.map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={cn(
              "min-w-[32px] h-8 px-2 rounded font-label-sm text-label-sm font-semibold transition-colors",
              pageNum === safePage
                ? "bg-primary text-on-primary shadow-xs"
                : "border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low",
            )}
          >
            {pageNum}
          </button>
        ))}

        {/* Next */}
        <button
          onClick={() => onPageChange(Math.min(safePage + 1, totalPages))}
          disabled={safePage >= totalPages}
          className="p-1.5 border border-outline-variant rounded bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}