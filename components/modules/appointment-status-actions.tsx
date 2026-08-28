"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAppointmentStatusAction } from "@/app/(dashboard)/appointments/actions";
import type { AppointmentStatus } from "@/lib/supabase/types";

const TRANSITIONS: Record<string, { label: string; next: AppointmentStatus; style: string }[]> = {
  scheduled: [
    { label: "Confirm", next: "confirmed", style: "bg-primary text-on-primary" },
    { label: "Cancel", next: "cancelled", style: "border border-outline-variant text-on-surface" },
  ],
  confirmed: [
    { label: "Mark Completed", next: "completed", style: "bg-primary text-on-primary" },
    { label: "No Show", next: "no_show", style: "border border-outline-variant text-on-surface" },
    { label: "Cancel", next: "cancelled", style: "border border-outline-variant text-on-surface" },
  ],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function AppointmentStatusActions({
  appointmentId,
  currentStatus,
}: {
  appointmentId: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const options = TRANSITIONS[currentStatus] ?? [];

  if (options.length === 0) return null;

  return (
    <div className="flex gap-md">
      {options.map((opt) => (
        <button
          key={opt.next}
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await updateAppointmentStatusAction(appointmentId, opt.next);
              router.refresh();
            })
          }
          className={`px-lg py-sm rounded-lg text-label-md transition-colors disabled:opacity-60 ${opt.style}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
