"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resetPasswordSchema } from "@/lib/validators";
import { getUserFacingMessage } from "@/lib/errors";

export type ResetPasswordState = { error: string | null };

export async function updatePasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    password: String(formData.get("password") || ""),
    confirmPassword: String(formData.get("confirmPassword") || ""),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { password } = parsed.data;
  const supabase = createClient();

  // Ensure the user is actually signed in (recovery session).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Your reset link has expired or is invalid. Please request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      error: getUserFacingMessage(
        error,
        "Could not update your password. Please try again.",
      ),
    };
  }

  // Sign out the recovery session so the user can log in fresh.
  await supabase.auth.signOut();

  redirect("/login?reset=success");
}
