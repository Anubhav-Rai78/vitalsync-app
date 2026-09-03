"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useTransition } from "react";
import { toast } from "sonner";
import { bookAppointmentAction } from "@/app/(dashboard)/appointments/actions";
import { bookAppointmentSchema } from "@/lib/validators";

const APPOINTMENT_TYPES = ["Consultation", "Follow-up", "Routine Checkup", "Specialist Visit"];

interface BookFormValues {
  patientId: string;
  doctorId: string;
  reason: string;
  date: string;
  time: string;
  duration: number;
  notes?: string;
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
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookFormValues>({
    defaultValues: {
      patientId: preselectedPatientId ?? "",
      doctorId: "",
      reason: APPOINTMENT_TYPES[0],
      date: preselectedDate ?? "",
      time: "",
      duration: 30,
      notes: "",
    },
  });

  const onSubmit = (data: BookFormValues) => {
    startTransition(async () => {
      const parsed = bookAppointmentSchema.safeParse({
        patient_id: data.patientId,
        doctor_id: data.doctorId,
        scheduled_at: `${data.date}T${data.time}`,
        duration_minutes: data.duration,
        reason: data.reason,
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Invalid input.");
        return;
      }

      const formData = new FormData();
      formData.set("patientId", data.patientId);
      formData.set("doctorId", data.doctorId);
      formData.set("date", data.date);
      formData.set("time", data.time);
      formData.set("duration", String(data.duration));
      formData.set("reason", data.reason);
      formData.set("notes", data.notes ?? "");

      const res = await bookAppointmentAction({ error: null }, formData);
      if (res.error) {
        toast.error(res.error);
      }
    });
  };

  const inputClass =
    "w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";
  const labelClass = "block text-label-md text-on-surface mb-xs";

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

      <form onSubmit={handleSubmit(onSubmit)} className="p-lg space-y-lg">
        <div className="space-y-xs">
          <label className={labelClass}>Patient</label>
          <select className={inputClass} {...register("patientId")}>
            <option value="">Select a patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
          {errors.patientId && (
            <p className="text-body-sm text-error">{errors.patientId.message}</p>
          )}
        </div>

        <div className="space-y-xs">
          <label className={labelClass}>Provider</label>
          <select className={inputClass} {...register("doctorId")}>
            <option value="">Select a provider</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                Dr. {d.full_name} {d.specialty ? `— ${d.specialty}` : ""}
              </option>
            ))}
          </select>
          {errors.doctorId && (
            <p className="text-body-sm text-error">{errors.doctorId.message}</p>
          )}
        </div>

        <div className="space-y-xs">
          <label className={labelClass}>Appointment Type</label>
          <div className="flex flex-wrap gap-xs">
            {APPOINTMENT_TYPES.map((type) => (
              <label key={type}>
                <input
                  type="radio"
                  value={type}
                  className="peer sr-only"
                  {...register("reason")}
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
            <label className={labelClass}>Date</label>
            <input type="date" className={inputClass} {...register("date")} />
            {errors.date && (
              <p className="text-body-sm text-error">{errors.date.message}</p>
            )}
          </div>
          <div className="space-y-xs">
            <label className={labelClass}>Time</label>
            <input type="time" className={inputClass} {...register("time")} />
            {errors.time && (
              <p className="text-body-sm text-error">{errors.time.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-xs">
          <label className={labelClass}>Duration</label>
          <select className={inputClass} {...register("duration", { valueAsNumber: true })}>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
          </select>
        </div>

        <div className="space-y-xs">
          <label className={labelClass}>Notes (optional)</label>
          <textarea
            rows={3}
            className="w-full px-md py-sm bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            placeholder="Anything the provider should know ahead of the visit"
            {...register("notes")}
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
          <button
            className="px-lg py-sm rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-label-md shadow-sm transition-colors flex items-center gap-xs disabled:opacity-60"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Booking…" : "Confirm Booking"}
            <span className="material-symbols-outlined text-[18px]">check</span>
          </button>
        </div>
      </form>
    </div>
  );
}