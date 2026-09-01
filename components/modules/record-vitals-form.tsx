"use client";

import React, { useState, useTransition } from "react";
import { recordVitalsAction } from "@/app/(dashboard)/patients/actions";

export function RecordVitalsForm({
  patientId,
  onRecorded,
}: {
  patientId: string;
  onRecorded?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await recordVitalsAction(patientId, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        form.reset();
        onRecorded?.();
        setTimeout(() => setSuccess(false), 2500);
      }
    });
  };

  return (
    <div className="border-t border-outline-variant pt-md">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-label-md text-on-surface hover:bg-surface-container-low transition-colors"
      >
        <span className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-[18px] text-primary">monitor_heart</span>
          Record new vitals
        </span>
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-md rounded-xl border border-outline-variant bg-surface-container-lowest p-md space-y-md">
          {error && (
            <div className="rounded-lg bg-error-container text-on-error-container text-body-sm px-sm py-2">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-secondary-container/30 text-secondary text-body-sm px-sm py-2">
              Vitals recorded.
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-md">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-label-sm text-on-surface mb-xs">Blood pressure (mmHg)</label>
              <div className="flex gap-xs">
                <input
                  name="systolic"
                  type="number"
                  min={40}
                  max={300}
                  placeholder="SYS"
                  className="w-full h-9 px-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-sm"
                />
                <input
                  name="diastolic"
                  type="number"
                  min={20}
                  max={200}
                  placeholder="DIA"
                  className="w-full h-9 px-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-label-sm text-on-surface mb-xs">Heart rate (bpm)</label>
              <input
                name="heartRate"
                type="number"
                min={20}
                max={300}
                placeholder="72"
                className="w-full h-9 px-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-sm"
              />
            </div>
            <div>
              <label className="block text-label-sm text-on-surface mb-xs">Weight (kg)</label>
              <input
                name="weight"
                type="number"
                min={1}
                max={500}
                step="0.1"
                placeholder="84.5"
                className="w-full h-9 px-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-sm"
              />
            </div>
            <div>
              <label className="block text-label-sm text-on-surface mb-xs">Temperature (°C)</label>
              <input
                name="temperature"
                type="number"
                min={25}
                max={45}
                step="0.1"
                placeholder="38.2"
                className="w-full h-9 px-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-sm"
              />
            </div>
            <div>
              <label className="block text-label-sm text-on-surface mb-xs">SpO₂ (%)</label>
              <input
                name="spo2"
                type="number"
                min={50}
                max={100}
                placeholder="99"
                className="w-full h-9 px-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-sm"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="px-lg py-sm rounded-lg bg-primary text-on-primary text-label-md hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60"
            >
              {isPending ? "Saving…" : "Save Vitals"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}