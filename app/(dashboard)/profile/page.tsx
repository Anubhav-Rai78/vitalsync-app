import { createClient } from "@/lib/supabase/server";
import { ProfilePreferences } from "@/components/modules/profile-preferences";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  return <ProfilePreferences profile={profile!} email={user!.email ?? ""} />;
}
