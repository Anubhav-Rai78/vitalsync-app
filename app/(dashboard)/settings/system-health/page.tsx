import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

// Free-tier reference ceilings — re-verify against current Supabase/Vercel
// docs at build/deploy time, these change. Kept here (not hardcoded in the
// Edge Function) so updating them doesn't require redeploying the function.
const FREE_TIER_LIMITS = {
  db_size_mb: 500,
  storage_mb: 1024,
  monthly_active_users: 50000,
};

export default async function SystemHealthPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("clinic_id").eq("id", user!.id).single();

  const { data: metrics } = await supabase
    .from("usage_metrics")
    .select("*")
    .eq("clinic_id", profile!.clinic_id)
    .order("recorded_at", { ascending: false })
    .limit(20);

  const latestByName = new Map<string, { value: number; recorded_at: string }>();
  for (const m of metrics ?? []) {
    if (!latestByName.has(m.metric_name)) {
      latestByName.set(m.metric_name, { value: Number(m.value), recorded_at: m.recorded_at });
    }
  }

  const cards = [
    { key: "db_size_mb", label: "Database Size", unit: "MB", limit: FREE_TIER_LIMITS.db_size_mb },
    { key: "storage_mb", label: "Storage Used", unit: "MB", limit: FREE_TIER_LIMITS.storage_mb },
    { key: "monthly_active_users", label: "Monthly Active Users", unit: "", limit: FREE_TIER_LIMITS.monthly_active_users },
  ];

  return (
    <div className="space-y-lg">
      <div>
        <h2 className="text-headline-lg text-on-surface">System Health</h2>
        <p className="text-body-sm text-on-surface-variant mt-xs">
          Usage against your current free-tier limits. Recorded daily by the{" "}
          <code className="text-[13px]">usage-monitor</code> Edge Function.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => {
          const latest = latestByName.get(card.key);
          const pct = latest ? Math.min(100, Math.round((latest.value / card.limit) * 100)) : 0;
          const warn = pct >= 80;

          return (
            <div key={card.key} className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/50 shadow-sm">
              <p className="text-label-md text-on-surface-variant mb-2">{card.label}</p>
              <p className="text-headline-md text-on-surface tabular-nums mb-3">
                {latest ? `${latest.value}${card.unit}` : "No data yet"}{" "}
                <span className="text-label-sm text-on-surface-variant">
                  {latest && `/ ${card.limit}${card.unit} free tier`}
                </span>
              </p>
              <div className="h-2 w-full rounded-full bg-surface-container overflow-hidden">
                <div
                  className={`h-full rounded-full ${warn ? "bg-error" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {latest && (
                <p className="text-label-sm text-on-surface-variant mt-2">
                  Last recorded {formatDate(latest.recorded_at)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {(!metrics || metrics.length === 0) && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-lg text-body-sm text-on-surface-variant">
          No usage metrics recorded yet — this fills in automatically once the{" "}
          <code className="text-[13px]">usage-monitor</code> Edge Function (see{" "}
          <code className="text-[13px]">supabase/functions/usage-monitor</code>) is scheduled to run daily.
        </div>
      )}
    </div>
  );
}
