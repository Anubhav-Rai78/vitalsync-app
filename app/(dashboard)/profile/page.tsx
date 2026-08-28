import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/modules/profile-form";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  return <ProfileForm profile={profile!} email={user!.email ?? ""} />;
}
