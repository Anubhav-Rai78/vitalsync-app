// Deploy: supabase functions deploy usage-monitor
// Schedule: supabase functions schedule usage-monitor --cron "0 3 * * *"
// (or wire it to pg_cron calling this function's URL — see Supabase docs,
// scheduled-function support has moved around across Supabase versions,
// so check the current docs at deploy time.)
//
// What this does, matching the build plan (§7):
//   1. Records this clinic's current usage against known free-tier ceilings.
//   2. If a clinic is in "notify" or "auto" scaling_mode and near a limit,
//      inserts a notification for every admin in that clinic.
//   3. Does NOT attempt to silently upgrade anyone's billing plan — see the
//      build plan for why that's not honestly buildable as a background
//      job today. "auto" mode is a placeholder for whichever vendor APIs
//      turn out to support self-serve upgrades at build time; wire those
//      in here once confirmed against current docs, per clinic.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const FREE_TIER_LIMITS = {
  db_size_mb: 500,
  storage_mb: 1024,
};

Deno.serve(async () => {
  const { data: clinics } = await supabase.from("clinics").select("id, scaling_mode");

  for (const clinic of clinics ?? []) {
    // Postgres's own pg_database_size() gives an accurate DB size figure.
    const { data: sizeRows } = await supabase.rpc("pg_database_size_mb").single();
    const dbSizeMb = (sizeRows as any)?.size_mb ?? 0;

    await supabase.from("usage_metrics").insert({
      clinic_id: clinic.id,
      metric_name: "db_size_mb",
      value: dbSizeMb,
    });

    const pctOfLimit = dbSizeMb / FREE_TIER_LIMITS.db_size_mb;

    if (pctOfLimit >= 0.8 && clinic.scaling_mode !== "free") {
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("clinic_id", clinic.id)
        .eq("role", "admin");

      for (const admin of admins ?? []) {
        const bodyText = `Your database is at ${(pctOfLimit * 100).toFixed(0)}% of the Supabase free-tier size limit. Review Settings → Scaling & Billing.`;
        
        await supabase.from("notifications").insert({
          profile_id: admin.id,
          title: "Approaching free-tier database limit",
          body: bodyText,
        });

        // Query the email from auth
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(admin.id);
          const email = userData?.user?.email;
          const resendApiKey = Deno.env.get("RESEND_API_KEY");
          
          if (resendApiKey && email) {
            const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: `VitalSync Alerts <${fromEmail}>`,
                to: email,
                subject: "Action Required: VitalSync Nearing Database Limit",
                html: `<p>Hello,</p>
                       <p>${bodyText}</p>
                       <p><a href="${Deno.env.get("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000"}/settings">Go to Settings</a></p>`,
              }),
            });
          }
        } catch (err) {
          console.error(`Failed to send email to admin ${admin.id}:`, err);
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

// Companion SQL function (add to a migration):
//
// create or replace function pg_database_size_mb()
// returns table(size_mb numeric) as $$
//   select round(pg_database_size(current_database()) / 1024.0 / 1024.0, 2);
// $$ language sql stable;
