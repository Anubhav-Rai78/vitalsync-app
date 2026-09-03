"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUserFacingMessage } from "@/lib/errors";
import { registerSchema } from "@/lib/validators";

export type RegisterState = { error: string | null };

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    fullName: String(formData.get("fullName") || ""),
    clinicName: String(formData.get("clinicName") || "") || undefined,
    workEmail: String(formData.get("workEmail") || ""),
    phoneNumber: String(formData.get("phoneNumber") || "") || undefined,
    password: String(formData.get("password") || ""),
    confirmPassword: String(formData.get("confirmPassword") || ""),
    terms: formData.get("terms") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { fullName, clinicName, workEmail, phoneNumber, password } = parsed.data;

  // The very first person to register becomes this clinic's admin and
  // names the clinic. Every registration after that is a staff member
  // joining the existing (single-tenant, for now) clinic as front_desk —
  // an admin can promote them to doctor/admin afterwards in Settings.
  const admin = createAdminClient();
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true });
  const isFirstUser = (count ?? 0) === 0;

  if (isFirstUser && clinicName) {
    const { data: clinics } = await admin.from("clinics").select("id").limit(1);
    if (clinics && clinics[0]) {
      await admin.from("clinics").update({ name: clinicName }).eq("id", clinics[0].id);
    }
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email: workEmail,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phoneNumber,
        role: isFirstUser ? "admin" : "front_desk",
      },
    },
  });

  if (error) {
    return { error: getUserFacingMessage(error, "Registration failed. Please try again.") };
  }

  redirect("/dashboard");
}
