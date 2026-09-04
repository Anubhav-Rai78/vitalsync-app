import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/modules/dashboard-shell";
import { DashboardShortcuts } from "@/components/modules/dashboard-shortcuts";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <>
      <DashboardShortcuts />
      <DashboardShell
        userName={profile.full_name}
        userRole={profile.role}
        avatarUrl={profile.avatar_url}
      >
        {children}
      </DashboardShell>
    </>
  );
}
