"use client";

import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { bookAppointmentAction, type AppointmentFormState } from "@/app/(dashboard)/appointments/actions";

const initialState: AppointmentFormState = { error: null };

const APPOINTMENT_TYPES = ["Consultation", "Follow-up", "Routine Checkup", "Specialist Visit"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="px-lg py-sm rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-label-md shadow-sm transition-colors flex items-center gap-xs disabled:opacity-60"
      type="submit"
      disabled={pending}
    >
      {pending ? "Booking…" : "Confirm Booking"}
      <span className="material-symbols-outlined text-[18px]">check</span>
    </button>
  );
}

export function BookAppointmentForm({
  patients,
  doctors,
  preselectedPatientId,
  preselectedDate,
}: {
  patients: { id: string; full_name: string }[];
  doctors: { id: string; full_name: string; specialty: string | null }[];
  preselectedPatientId?: string;
  preselectedDate?: string;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(bookAppointmentAction, initialState);

  return (
    <div className="max-w-xl mx-auto bg-surface border border-outline-variant rounded-xl">
      <div className="flex items-center justify-between p-lg border-b border-outline-variant">
        <h2 className="text-headline-md text-on-surface">Book Appointment</h2>
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Close"
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
          <label className="block text-label-md text-on-surface">Provider</label>
          <select
            name="doctorId"
            required
            className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          >
            <option disabled value="">Select a provider</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                Dr. {d.full_name} {d.specialty ? `— ${d.specialty}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-xs">
          <label className="block text-label-md text-on-surface">Appointment Type</label>
          <div className="flex flex-wrap gap-xs">
            {APPOINTMENT_TYPES.map((type, i) => (
              <label key={type}>
                <input
                  type="radio"
                  name="reason"
                  value={type}
                  defaultChecked={i === 0}
                  className="peer sr-only"
                />
                <span className="px-md py-sm rounded-full border border-outline-variant bg-surface peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary text-on-surface-variant text-label-md transition-colors cursor-pointer inline-block">
                  {type}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div className="space-y-xs">
            <label className="block text-label-md text-on-surface">Date</label>
            <input
              type="date"
              name="date"
              required
              defaultValue={preselectedDate ?? ""}
              className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>
          <div className="space-y-xs">
            <label className="block text-label-md text-on-surface">Time</label>
            <input
              type="time"
              name="time"
              required
              className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="space-y-xs">
          <label className="block text-label-md text-on-surface">Duration</label>
          <select
            name="duration"
            defaultValue="30"
            className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          >
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
          </select>
        </div>

        <div className="space-y-xs">
          <label className="block text-label-md text-on-surface">Notes (optional)</label>
          <textarea
            name="notes"
            rows={3}
            className="w-full px-md py-sm bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            placeholder="Anything the provider should know ahead of the visit"
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
