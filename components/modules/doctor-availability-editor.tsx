"use client";

import React, { useState, useTransition } from "react";
import { updateAvailabilityAction } from "@/app/(dashboard)/doctors/actions";

export type DayAvailability = {
  start_time: string; // "HH:mm"
  end_time: string; // "HH:mm"
  is_available: boolean;
};

// Sunday = 0 … Saturday = 6 (JS Date.getDay() convention). Displayed
// Monday-first to match the existing availability grid on the profile.
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

function formatTime(twelveHour: string): string {
  if (!twelveHour) return "—";
  const [hRaw, mRaw] = twelveHour.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return twelveHour;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function DoctorAvailabilityEditor({
  doctorId,
  availabilityByDay,
  onSaved,
}: {
  doctorId: string;
  availabilityByDay: Record<number, DayAvailability>;
  onSaved?: () => void;
}) {
  const [draft, setDraft] = useState<Record<number, DayAvailability>>(() => {
    const init: Record<number, DayAvailability> = {};
    for (let i = 0; i < 7; i++) {
      init[i] = availabilityByDay[i] ?? { start_time: "09:00", end_time: "17:00", is_available: true };
    }
    return init;
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const patch = (day: number, partial: Partial<DayAvailability>) => {
    setDraft((prev) => ({ ...prev, [day]: { ...prev[day], ...partial } }));
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateAvailabilityAction(doctorId, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        onSaved?.();
        setTimeout(() => setSuccess(false), 2500);
      }
    });
  };

  return (
    <form onSubmit={handleSave} className="space-y-md">
      {error && (
        <div className="rounded-lg bg-error-container text-on-error-container text-body-sm px-sm py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-secondary-container/30 text-secondary text-body-sm px-sm py-2">
          Availability saved.
        </div>
      )}

      <div className="space-y-sm">
        {DISPLAY_ORDER.map((day) => (
          <div
            key={day}
            className="flex items-center gap-md rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm"
          >
            <input
              type="checkbox"
              name={`available_${day}`}
              id={`available_${day}`}
              checked={draft[day].is_available}
              onChange={(e) => patch(day, { is_available: e.target.checked })}
              className="w-4 h-4 text-primary rounded border-outline-variant"
            />
            <label htmlFor={`available_${day}`} className="w-24 text-label-md text-on-surface font-medium">
              {DAY_NAMES[day]}
            </label>
            <div className="flex-1 flex items-center gap-xs text-body-sm text-on-surface-variant">
              <span>Available</span>
              <span className="text-on-surface-variant/50">·</span>
              <span className="font-medium">{formatTime(draft[day].start_time)} − {formatTime(draft[day].end_time)}</span>
            </div>
            <div className="flex items-center gap-xs">
              <input
                name={`start_${day}`}
                type="time"
                value={draft[day].start_time}
                onChange={(e) => patch(day, { start_time: e.target.value })}
                className="h-8 px-sm bg-surface-container-low border border-outline-variant rounded-lg text-label-sm"
              />
              <span className="text-on-surface-variant">to</span>
              <input
                name={`end_${day}`}
                type="time"
                value={draft[day].end_time}
                onChange={(e) => patch(day, { end_time: e.target.value })}
                className="h-8 px-sm bg-surface-container-low border border-outline-variant rounded-lg text-label-sm"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-lg py-sm rounded-lg bg-primary text-on-primary text-label-md hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save Availability"}
        </button>
      </div>
    </form>
  );
}