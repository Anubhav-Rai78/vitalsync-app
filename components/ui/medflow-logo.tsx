import React from "react";

interface MedFlowLogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function MedFlowLogo({
  className = "",
  showText = true,
  size = "md",
}: MedFlowLogoProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const textClasses = {
    sm: "text-lg font-bold",
    md: "text-xl font-bold tracking-tight",
    lg: "text-2xl font-bold tracking-tight",
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`relative flex items-center justify-center rounded-lg bg-primary text-white shadow-level-2 ${sizeClasses[size]}`}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <path d="M12 4v16m-8-8h16" />
          <circle cx="12" cy="12" r="2.5" className="fill-secondary stroke-none animate-pulse" />
        </svg>
      </div>
      {showText && (
        <span className={`font-display text-on-surface ${textClasses[size]}`}>
          Med<span className="text-primary">Flow</span>
          <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-on-secondary bg-secondary rounded">Clinic</span>
        </span>
      )}
    </div>
  );
}
