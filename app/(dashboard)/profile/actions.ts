"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserFacingMessage } from "@/lib/errors";
import { updateProfileSchema } from "@/lib/validators";

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

  const parsed = updateProfileSchema.safeParse({
    full_name: String(formData.get("fullName") || ""),
    phone: String(formData.get("phone") || ""),
    specialisation: String(formData.get("specialty") || ""),
    license_no: undefined,
    bio: undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { full_name, phone, specialisation } = parsed.data;

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      phone: phone || null,
      specialty: specialisation || null,
      avatar_url: String(formData.get("avatarUrl") || "") || null,
    })
    .eq("id", user.id);

  if (error) return { error: getUserFacingMessage(error, "Failed to update profile.") };

  revalidatePath("/profile");
  return { error: null, success: true };
}
