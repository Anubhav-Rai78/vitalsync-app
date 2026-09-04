"use server";

import { createClient } from "@/lib/supabase/server";
import { forgotPasswordSchema } from "@/lib/validators";
import { getUserFacingMessage } from "@/lib/errors";

export type ForgotPasswordState = { sent: boolean; error: string | null };

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: String(formData.get("email") || ""),
  });

  if (!parsed.success) {
    return {
      sent: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { email } = parsed.data;

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return {
      sent: false,
      error: getUserFacingMessage(
        error,
        "Could not send reset email. Please try again.",
      ),
    };
  }

  // Always return "sent" so we never reveal whether the email exists.
  return { sent: true, error: null };
}
