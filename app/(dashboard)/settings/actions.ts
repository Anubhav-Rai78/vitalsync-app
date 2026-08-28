"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ScalingMode, UserRole } from "@/lib/supabase/types";

export type SettingsFormState = { error: string | null; success?: boolean };

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("clinic_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return null;
  return { supabase, profile };
}

export async function updateClinicDetailsAction(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Only admins can update clinic settings." };

  const { error } = await ctx.supabase
    .from("clinics")
    .update({
      name: String(formData.get("name") || ""),
      address: String(formData.get("address") || ""),
      phone: String(formData.get("phone") || ""),
      logo_url: String(formData.get("logoUrl") || "") || null,
    })
    .eq("id", ctx.profile.clinic_id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { error: null, success: true };
}

// This is the concrete implementation of the "start free, scale to paid"
// system described in the build plan (§7): the owner picks a mode here,
// and the usage-monitor Edge Function (supabase/functions/usage-monitor)
// reads this value to decide whether to just degrade gracefully, notify,
// or (only where a vendor genuinely supports it) attempt an upgrade.
export async function updateScalingModeAction(mode: ScalingMode) {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Only admins can change the scaling mode.");

  await ctx.supabase.from("clinics").update({ scaling_mode: mode }).eq("id", ctx.profile.clinic_id);
  revalidatePath("/settings");
}

export async function updateStaffRoleAction(staffId: string, role: UserRole) {
  const ctx = await requireAdmin();
  if (!ctx) throw new Error("Only admins can update staff roles.");

  await ctx.supabase
    .from("profiles")
    .update({ role })
    .eq("id", staffId)
    .eq("clinic_id", ctx.profile.clinic_id);

  revalidatePath("/settings");
}
