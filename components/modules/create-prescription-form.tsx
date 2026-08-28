"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { createPrescriptionAction, type PrescriptionFormState } from "@/app/(dashboard)/prescriptions/actions";

const initialState: PrescriptionFormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="px-lg py-sm rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-label-md shadow-sm transition-colors disabled:opacity-60"
      type="submit"
      disabled={pending}
    >
      {pending ? "Saving…" : "Save Prescription"}
    </button>
  );
}

export function CreatePrescriptionForm({
  patients,
  preselectedPatientId,
}: {
  patients: { id: string; full_name: string }[];
  preselectedPatientId?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(createPrescriptionAction, initialState);
  const [rows, setRows] = useState([0]);

  return (
    <div className="max-w-2xl mx-auto bg-surface border border-outline-variant rounded-xl">
      <div className="flex items-center justify-between p-lg border-b border-outline-variant">
        <h2 className="text-headline-md text-on-surface">Create Prescription</h2>
        <button
          type="button"
          onClick={() => router.back()}
          className="p-sm rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <form action={formAction} className="p-lg space-y-lg">
        {state.error && (
          <div className="rounded-lg bg-error-container text-on-error-container text-body-sm px-sm py-2">
            {state.error}
          </div>
        )}

        <div className="space-y-xs">
          <label className="block text-label-md text-on-surface">Patient</label>
          <select
            name="patientId"
            required
            defaultValue={preselectedPatientId ?? ""}
            className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          >
            <option disabled value="">Select a patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-xs">
          <label className="block text-label-md text-on-surface">Diagnosis</label>
          <input
            name="diagnosis"
            className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            placeholder="e.g. Acute bronchitis"
          />
        </div>

        <div className="space-y-md">
          <div className="flex items-center justify-between">
            <label className="block text-label-md text-on-surface">Medications</label>
            <button
              type="button"
              onClick={() => setRows((r) => [...r, r.length])}
              className="text-primary text-label-sm hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add medication
            </button>
          </div>

          {rows.map((row) => (
            <div key={row} className="grid grid-cols-2 gap-md p-md border border-outline-variant rounded-lg">
              <div className="col-span-2">
                <label className="block text-label-sm text-on-surface-variant mb-1">Drug name</label>
                <input
                  name="drugName"
                  className="w-full h-9 px-sm bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm"
                  placeholder="e.g. Amoxicillin"
                />
              </div>
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1">Dosage</label>
                <input
                  name="dosage"
                  className="w-full h-9 px-sm bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm"
                  placeholder="500mg"
                />
              </div>
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1">Frequency</label>
                <input
                  name="frequency"
                  className="w-full h-9 px-sm bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm"
                  placeholder="3x daily"
                />
              </div>
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1">Duration</label>
                <input
                  name="duration"
                  className="w-full h-9 px-sm bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm"
                  placeholder="7 days"
                />
              </div>
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1">Instructions</label>
                <input
                  name="instructions"
                  className="w-full h-9 px-sm bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm"
                  placeholder="Take with food"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-xs">
          <label className="block text-label-md text-on-surface">Notes (optional)</label>
          <textarea
            name="notes"
            rows={3}
            className="w-full px-md py-sm bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>

        <div className="flex justify-end gap-md pt-md border-t border-outline-variant">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-lg py-sm rounded-lg border border-outline-variant bg-surface hover:bg-surface-container text-on-surface text-label-md transition-colors"
          >
            Cancel
          </button>
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
