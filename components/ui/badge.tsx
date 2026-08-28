import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Pill shape, 10%-opacity semantic bg, full-opacity text — per DESIGN.md.
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-label-sm uppercase tracking-wide",
  {
    variants: {
      variant: {
        neutral: "bg-surface-container text-on-surface-variant",
        success: "bg-[#22c55e]/10 text-[#166534]",
        warning: "bg-[#f59e0b]/10 text-[#92400e]",
        error: "bg-error-container text-on-error-container",
        info: "bg-primary-container/10 text-primary",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
