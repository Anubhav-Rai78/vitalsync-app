import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClinicSettingsForm } from "@/components/modules/clinic-settings-form";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/dashboard");

  const { data: clinic } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", profile.clinic_id)
    .single();

  if (!clinic) redirect("/dashboard");

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("clinic_id", profile.clinic_id)
    .order("full_name");

  return <ClinicSettingsForm clinic={clinic} staff={staff ?? []} />;
}
