"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  ArrowLeft,
  Award,
  DoorOpen,
  Mail,
  Phone,
  Stethoscope,
  User,
} from "lucide-react";
import {
  createDoctorAction,
  type CreateDoctorFormState,
} from "@/app/(dashboard)/doctors/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// The task's "Add New Doctor" route. Without this dedicated page, /doctors/new
// was matched by the dynamic [id] route and rendered "Doctor record not found".
// The submit handler delegates to createDoctorAction (doctors/actions.ts), which
// is admin-gated, inserts the doctor profile, seeds default 7-day availability,
// and redirects to the new doctor's profile.
const initialState: CreateDoctorFormState = { error: null };

const SPECIALTIES = [
  "Cardiology",
  "Pediatrics",
  "General Medicine",
  "Neurology",
  "Orthopedics",
  "Dermatology",
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-primary hover:bg-blue-700 text-on-primary text-label-md font-semibold px-lg shadow-sm"
    >
      {pending ? "Saving…" : "Save Doctor Profile"}
    </Button>
  );
}

export default function NewDoctorPage() {
  const router = useRouter();
  const [state, formAction] = useFormState(createDoctorAction, initialState);

  return (
    <div className="max-w-3xl mx-auto space-y-lg">
      {/* Back link */}
      <Link
        href="/doctors"
        className="inline-flex items-center gap-1.5 text-label-sm font-semibold text-on-surface-variant hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Doctors
      </Link>

      {/* Header */}
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">
          Add New Doctor
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
          Register a new medical professional to the clinic roster.
        </p>
      </div>

      {/* Form card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
        {state.error && (
          <div className="mb-lg p-md rounded-lg bg-error-container/40 text-on-error-container border border-error-container text-body-sm">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            <div className="space-y-xs">
              <Label htmlFor="fullName">Full Name *</Label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <Input
                  id="fullName"
                  name="fullName"
                  required
                  className="pl-10"
                  placeholder="e.g. Dr. Priya Sundaram"
                />
              </div>
            </div>

            <div className="space-y-xs">
              <Label htmlFor="specialty">Specialty *</Label>
              <div className="relative">
                <Stethoscope className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <select
                  id="specialty"
                  name="specialty"
                  defaultValue="General Medicine"
                  className="w-full h-10 pl-10 pr-8 bg-surface-container-low border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary cursor-pointer text-body-sm"
                >
                  {SPECIALTIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-xs">
              <Label htmlFor="licenseNo">Medical License Number</Label>
              <div className="relative">
                <Award className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <Input
                  id="licenseNo"
                  name="licenseNo"
                  className="pl-10"
                  placeholder="e.g. KMC-99214"
                />
              </div>
            </div>

            <div className="space-y-xs">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="pl-10"
                  placeholder="+91 98450 11223"
                />
              </div>
            </div>

            <div className="space-y-xs">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  className="pl-10"
                  placeholder="dr.priya@medflow.in"
                />
              </div>
            </div>

            <div className="space-y-xs">
              <Label htmlFor="consultationRoom">Consultation Room</Label>
              <div className="relative">
                <DoorOpen className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <Input
                  id="consultationRoom"
                  name="consultationRoom"
                  className="pl-10"
                  placeholder="e.g. Room 204"
                />
              </div>
            </div>

            <div className="space-y-xs">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue="active"
                className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary cursor-pointer text-body-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <p className="text-[11px] text-on-surface-variant">
                New doctors are registered as Active by default.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-sm pt-md border-t border-outline-variant">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/doctors")}
              className="text-label-md font-semibold"
            >
              Cancel
            </Button>
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}
