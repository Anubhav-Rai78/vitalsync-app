"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { toast } from "sonner";
import { createPatientAction } from "@/app/(dashboard)/patients/actions";
import { createPatientSchema, type CreatePatientPayload } from "@/lib/validators";

export function AddPatientForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePatientPayload>({
    resolver: zodResolver(createPatientSchema),
    defaultValues: {
      full_name: "",
      dob: "",
      phone: "",
      email: "",
      allergies: "",
      blood_group: "",
      gender: "",
      address: "",
    },
  });

  const onSubmit = (data: CreatePatientPayload) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("fullName", data.full_name);
      formData.set("dob", data.dob ?? "");
      formData.set("phone", data.phone ?? "");
      formData.set("email", data.email ?? "");
      formData.set("allergies", data.allergies ?? "");
      formData.set("bloodGroup", data.blood_group ?? "");
      formData.set("sex", data.gender ?? "");
      formData.set("address", data.address ?? "");
      formData.set("city", "");
      formData.set("zip", "");

      const res = await createPatientAction({ error: null }, formData);
      if (res.error) {
        toast.error(res.error);
      }
    });
  };

  const inputClass =
    "w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all";
  const labelClass = "block text-label-sm text-on-surface mb-xs";

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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-xl bg-surface border border-outline-variant rounded-xl p-lg">

        <section>
          <h3 className="text-label-md font-semibold text-on-surface-variant mb-md uppercase tracking-wider">
            Personal Information
          </h3>
          <div className="space-y-md">
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                className={inputClass}
                placeholder="e.g. Jane Doe"
                type="text"
                {...register("full_name")}
              />
              {errors.full_name && (
                <p className="text-body-sm text-error mt-xs">{errors.full_name.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-md">
              <div>
                <label className={labelClass}>Date of Birth</label>
                <input
                  className={inputClass}
                  type="date"
                  {...register("dob")}
                />
              </div>
              <div>
                <label className={labelClass}>Gender</label>
                <select
                  className={inputClass}
                  defaultValue=""
                  {...register("gender")}
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
                <label className={labelClass}>Phone</label>
                <input
                  className={inputClass}
                  placeholder="+91 98765 43210"
                  type="tel"
                  {...register("phone")}
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  className={inputClass}
                  placeholder="patient@example.com"
                  type="email"
                  {...register("email")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-md">
              <div>
                <label className={labelClass}>Allergies</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Penicillin, Latex"
                  type="text"
                  {...register("allergies")}
                />
              </div>
              <div>
                <label className={labelClass}>Blood Group</label>
                <select
                  className={inputClass}
                  defaultValue=""
                  {...register("blood_group")}
                >
                  <option disabled value="">Select</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
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
              <label className={labelClass}>Street Address</label>
              <input
                className={inputClass}
                placeholder="123 Medical Way, Suite 100"
                type="text"
                {...register("address")}
              />
            </div>
            <div className="grid grid-cols-2 gap-md">
              <div>
                <label className={labelClass}>City</label>
                <input
                  className={inputClass}
                  placeholder="City"
                  type="text"
                  name="city"
                />
              </div>
              <div>
                <label className={labelClass}>PIN Code</label>
                <input
                  className={inputClass}
                  placeholder="600001"
                  type="text"
                  name="zip"
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
              <label className={labelClass}>Contact Name</label>
              <input
                className={inputClass}
                placeholder="Name"
                type="text"
                name="emergencyName"
              />
            </div>
            <div>
              <label className={labelClass}>Contact Phone</label>
              <input
                className={inputClass}
                placeholder="+91 98765 43210"
                type="tel"
                name="emergencyPhone"
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
          <button
            className="px-md py-sm rounded-lg text-label-md font-medium text-on-primary bg-primary hover:bg-surface-tint transition-colors shadow-sm disabled:opacity-60"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save Patient"}
          </button>
        </div>
      </form>
    </div>
  );
}
