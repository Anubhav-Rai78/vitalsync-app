import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfilePreferences } from "@/components/modules/profile-preferences";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/dashboard");

  return <ProfilePreferences profile={profile} email={user.email ?? ""} />;
}
