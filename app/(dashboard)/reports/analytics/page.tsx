import { createClient } from "@/lib/supabase/server";
import { WeeklyActivityChart } from "@/components/modules/weekly-activity-chart";

export default async function AnalyticsPage() {
  const supabase = createClient();

  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("start_time, status")
    .gte("start_time", since.toISOString());

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    return d;
  });

  const chartData = days.map((day) => {
    const label = day.toLocaleDateString("en-IN", { weekday: "short" });
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const count = (appointments ?? []).filter((a) => {
      const t = new Date(a.start_time);
      return t >= dayStart && t <= dayEnd;
    }).length;

    return { day: label, appointments: count };
  });

  return (
    <div className="space-y-lg">
      <div>
        <h2 className="text-headline-lg text-on-surface">Analytics</h2>
        <p className="text-body-sm text-on-surface-variant mt-xs">Clinic activity over the last 7 days.</p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-lg">
        <h3 className="text-headline-sm text-on-surface mb-6">Appointments per Day</h3>
        <WeeklyActivityChart data={chartData} />
      </div>
    </div>
  );
}
