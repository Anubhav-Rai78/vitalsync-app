"use client";

import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { createPatientAction, type PatientFormState } from "@/app/(dashboard)/patients/actions";

const initialState: PatientFormState = { error: null };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="px-md py-sm rounded-lg text-label-md font-medium text-on-primary bg-primary hover:bg-surface-tint transition-colors shadow-sm disabled:opacity-60"
      type="submit"
      disabled={pending}
    >
      {pending ? "Saving…" : "Save Patient"}
    </button>
  );
}

export function AddPatientForm() {
  const router = useRouter();
  const [state, formAction] = useFormState(createPatientAction, initialState);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-lg">
        <h2 className="text-headline-sm text-on-surface">Add New Patient</h2>
        <button
          type="button"
          onClick={() => router.back()}
          className="p-xs rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <form action={formAction} className="space-y-xl bg-surface border border-outline-variant rounded-xl p-lg">
        {state.error && (
          <div className="rounded-lg bg-error-container text-on-error-container text-body-sm px-sm py-2">
            {state.error}
          </div>
        )}

        <section>
          <h3 className="text-label-md font-semibold text-on-surface-variant mb-md uppercase tracking-wider">
            Personal Information
          </h3>
          <div className="space-y-md">
            <div>
              <label className="block text-label-sm text-on-surface mb-xs">Full Name</label>
              <input
                name="fullName"
                required
                className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                placeholder="e.g. Jane Doe"
                type="text"
              />
            </div>
            <div className="grid grid-cols-2 gap-md">
              <div>
                <label className="block text-label-sm text-on-surface mb-xs">Date of Birth</label>
                <input
                  name="dob"
                  className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  type="date"
                />
              </div>
              <div>
                <label className="block text-label-sm text-on-surface mb-xs">Gender</label>
                <select
                  name="sex"
                  defaultValue=""
                  className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                >
                  <option disabled value="">Select</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-md">
              <div>
                <label className="block text-label-sm text-on-surface mb-xs">Phone</label>
                <input
                  name="phone"
                  className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="+91 98765 43210"
                  type="tel"
                />
              </div>
              <div>
                <label className="block text-label-sm text-on-surface mb-xs">Email</label>
                <input
                  name="email"
                  className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="patient@example.com"
                  type="email"
                />
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-label-md font-semibold text-on-surface-variant mb-md uppercase tracking-wider">
            Address
          </h3>
          <div className="space-y-md">
            <div>
              <label className="block text-label-sm text-on-surface mb-xs">Street Address</label>
              <input
                name="address"
                className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                placeholder="123 Medical Way, Suite 100"
                type="text"
              />
            </div>
            <div className="grid grid-cols-2 gap-md">
              <div>
                <label className="block text-label-sm text-on-surface mb-xs">City</label>
                <input
                  name="city"
                  className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="City"
                  type="text"
                />
              </div>
              <div>
                <label className="block text-label-sm text-on-surface mb-xs">PIN Code</label>
                <input
                  name="zip"
                  className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="600001"
                  type="text"
                />
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-label-md font-semibold text-on-surface-variant mb-md uppercase tracking-wider">
            Emergency Contact
          </h3>
          <div className="space-y-md">
            <div>
              <label className="block text-label-sm text-on-surface mb-xs">Contact Name</label>
              <input
                name="emergencyName"
                className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                placeholder="Name"
                type="text"
              />
            </div>
            <div>
              <label className="block text-label-sm text-on-surface mb-xs">Contact Phone</label>
              <input
                name="emergencyPhone"
                className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                placeholder="+91 98765 43210"
                type="tel"
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-md pt-md border-t border-outline-variant">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-md py-sm rounded-lg text-label-md font-medium text-on-surface bg-surface border border-outline-variant hover:bg-surface-container-low transition-colors"
          >
            Cancel
          </button>
          <SaveButton />
        </div>
      </form>
    </div>
  );
}
