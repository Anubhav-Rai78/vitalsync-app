"use server";

import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getUserFacingMessage } from "@/lib/errors";

export type RegisterState = { error: string | null };

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const fullName = String(formData.get("fullName") || "");
  const clinicName = String(formData.get("clinicName") || "");
  const email = String(formData.get("workEmail") || "");
  const phone = String(formData.get("phoneNumber") || "");
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  const agreedToTerms = formData.get("terms") === "on";

  if (!fullName || !email || !password) {
    return { error: "Full name, work email, and password are required." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }
  if (!agreedToTerms) {
    return { error: "You need to agree to the Terms of Service to continue." };
  }

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
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        role: isFirstUser ? "admin" : "front_desk",
      },
    },
  });

  if (error) {
    return { error: getUserFacingMessage(error, "Registration failed. Please try again.") };
  }

  redirect("/dashboard");
}
