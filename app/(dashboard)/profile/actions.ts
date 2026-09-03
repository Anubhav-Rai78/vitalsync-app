"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserFacingMessage } from "@/lib/errors";

export type ProfileFormState = { error: string | null; success?: boolean };

export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: String(formData.get("fullName") || ""),
      phone: String(formData.get("phone") || "") || null,
      specialty: String(formData.get("specialty") || "") || null,
      avatar_url: String(formData.get("avatarUrl") || "") || null,
    })
    .eq("id", user.id);

  if (error) return { error: getUserFacingMessage(error, "Failed to update profile.") };

  revalidatePath("/profile");
  return { error: null, success: true };
}
