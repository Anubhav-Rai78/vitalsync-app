import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export default async function ReportsPage() {
  const supabase = createClient();

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const [{ count: apptCount }, { data: invoices }, { count: newPatients }] = await Promise.all([
    supabase.from("appointments").select("id", { count: "exact", head: true }).gte("start_time", since.toISOString()),
    supabase.from("invoices").select("total, status").gte("created_at", since.toISOString()),
    supabase.from("patients").select("id", { count: "exact", head: true }).gte("created_at", since.toISOString()),
  ]);

  const revenue = (invoices ?? [])
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.total), 0);

  const stats = [
    { label: "Appointments (7d)", value: apptCount ?? 0, icon: "event" },
    { label: "New Patients (7d)", value: newPatients ?? 0, icon: "group_add" },
    { label: "Revenue Collected (7d)", value: formatCurrency(revenue), icon: "payments" },
  ];

  return (
    <div className="space-y-lg">
      <div>
        <h2 className="text-headline-lg text-on-surface">Operational Reports</h2>
        <p className="text-body-sm text-on-surface-variant mt-xs">Last 7 days at a glance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/50 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-label-md text-on-surface-variant">{s.label}</p>
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
              </div>
            </div>
            <h3 className="text-headline-md text-on-surface tabular-nums">{s.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-lg">
        <p className="text-body-sm text-on-surface-variant">
          For deeper analytics — trends over time, per-doctor breakdowns, patient demographics —
          see{" "}
          <a href="/reports/analytics" className="text-primary hover:underline">
            Analytics
          </a>
          .
        </p>
      </div>
    </div>
  );
}
