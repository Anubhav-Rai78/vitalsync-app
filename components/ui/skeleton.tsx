import { cn } from "@/lib/utils";

// Gradient-sweep skeletons, not spinners — per DESIGN.md loading-state rule.
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton rounded-lg", className)} {...props} />;
}

export { Skeleton };
