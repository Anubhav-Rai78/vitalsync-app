import React from "react";

interface MedFlowLogoProps {
  className?: string;
  showSubtitle?: boolean;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
}

export function MedFlowLogo({
  className = "",
  showSubtitle = false,
  subtitle = "Admin Console",
  size = "md",
}: MedFlowLogoProps) {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const textSizes = {
    sm: "text-[20px]",
    md: "text-[26px]",
    lg: "text-[36px]",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Medibox Medical Briefcase Icon */}
      <div
        className={`relative flex items-center justify-center shrink-0 rounded-xl bg-[#2563eb] text-white shadow-sm ${iconSizes[size]}`}
      >
        <div className="absolute -top-1 w-3.5 h-1.5 border-2 border-[#2563eb] rounded-t-sm" />
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
          <path d="M8.5 3h7v5.5H21v7h-5.5V21h-7v-5.5H3v-7h5.5V3z" />
        </svg>
      </div>

      {/* Typography with Standard Bold Inter + Wavy F */}
      <div className="flex flex-col">
        <div
          className={`flex items-center text-[#2563eb] ${textSizes[size]} font-[900] tracking-[-0.03em] leading-none select-none`}
        >
          <span>Med</span>
          <svg
            className="h-[0.95em] w-auto inline-block -mx-[0.02em] -mt-[0.06em]"
            viewBox="0 0 42 50"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 48V25C8 22.5 9.5 21 12 21H28C30.5 21 32 19.5 32 17C32 14.5 30.5 13 28 13H12C9.5 13 8 11.5 8 9V2C8 0.9 8.9 0 10 0H36C38.5 0 40 1.5 40 4C40 6.5 38.5 8 36 8H16V13H28C35 13 39 16.5 39 21C39 25.5 35 29 28 29H16V48C16 49.1 15.1 50 14 50H10C8.9 50 8 49.1 8 48Z"
              fill="#2563eb"
            />
          </svg>
          <span>low</span>
        </div>
        {showSubtitle && (
          <span className="text-[11px] font-medium text-slate-500 tracking-tight mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
