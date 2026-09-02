"use client";

import { useState } from "react";
import { Check, XCircle, AlertCircle } from "lucide-react";
import { updateAppointmentStatusAction } from "@/app/(dashboard)/appointments/actions";
import type { AppointmentStatus } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";

const TRANSITIONS: Record<
  string,
  { label: string; next: AppointmentStatus; variant: "primary" | "secondary" | "destructive"; className?: string }[]
> = {
  scheduled: [
    { label: "Confirm", next: "confirmed", variant: "primary" },
    { label: "Cancel", next: "cancelled", variant: "secondary", className: "text-error hover:border-error" },
  ],
  confirmed: [
    { label: "Mark Completed", next: "completed", variant: "primary" },
    { label: "No Show", next: "no_show", variant: "secondary" },
    { label: "Cancel", next: "cancelled", variant: "secondary", className: "text-error hover:border-error" },
  ],
  completed: [],
  cancelled: [
    { label: "Reopen Appointment", next: "scheduled", variant: "secondary" },
  ],
  no_show: [
    { label: "Reschedule Visit", next: "scheduled", variant: "secondary" },
  ],
};

export function AppointmentStatusActions({
  appointmentId,
  currentStatus,
  onStatusChange,
  onError,
}: {
  appointmentId: string;
  currentStatus: string;
  onStatusChange?: (next: AppointmentStatus) => void;
  onError?: (message: string) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const options = TRANSITIONS[currentStatus] ?? [];

  const handleTransition = async (next: AppointmentStatus) => {
    setUpdating(true);
    try {
      const res = await updateAppointmentStatusAction(appointmentId, next);
      if ("error" in res && res.error) {
        onError?.(res.error);
      } else {
        onStatusChange?.(next);
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setUpdating(false);
    }
  };

  if (currentStatus === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-secondary-container/20 text-secondary font-semibold text-label-md border border-secondary-container/50">
        <Check className="w-4 h-4" /> Visit Completed
      </span>
    );
  }

  if (currentStatus === "cancelled") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container-high text-on-surface-variant font-semibold text-label-md border border-outline-variant">
          <XCircle className="w-4 h-4" /> Appointment Cancelled
        </span>
        {options.map((opt) => (
          <Button
            key={opt.next}
            type="button"
            size="sm"
            disabled={updating}
            variant={opt.variant}
            onClick={() => handleTransition(opt.next)}
            className={opt.className}
          >
            {updating ? "Updating..." : opt.label}
          </Button>
        ))}
      </div>
    );
  }

  if (currentStatus === "no_show") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-error-container/40 text-on-error-container font-semibold text-label-md border border-error-container">
          <AlertCircle className="w-4 h-4" /> Marked as No Show
        </span>
        {options.map((opt) => (
          <Button
            key={opt.next}
            type="button"
            size="sm"
            disabled={updating}
            variant={opt.variant}
            onClick={() => handleTransition(opt.next)}
            className={opt.className}
          >
            {updating ? "Updating..." : opt.label}
          </Button>
        ))}
      </div>
    );
  }

  if (options.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Button
          key={opt.next}
          type="button"
          size="sm"
          disabled={updating}
          variant={opt.variant}
          onClick={() => handleTransition(opt.next)}
          className={opt.className}
        >
          {updating ? "Updating..." : opt.label}
        </Button>
      ))}
    </div>
  );
}
