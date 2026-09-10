export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { WeeklyActivityChart } from "@/components/modules/weekly-activity-chart";
import { getISTDayStartDaysAgo } from "@/lib/date";

export default async function AnalyticsPage() {
  const supabase = await createClient();

  // IST-aware: "6 days ago at IST midnight" → correct UTC instant for queries
  const since = getISTDayStartDaysAgo(6);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("start_time, status")
    .gte("start_time", since.toISOString());

  // Build the 7-day window using IST boundaries
  const dayBoundaries = Array.from({ length: 7 }, (_, i) => {
    const start = getISTDayStartDaysAgo(6 - i);
    const end = new Date(start.getTime() + 86_400_000 - 1); // +23:59:59.999
    return { start, end };
  });

  const chartData = dayBoundaries.map(({ start, end }) => {
    const label = start.toLocaleDateString("en-IN", {
      weekday: "short",
      timeZone: "Asia/Kolkata",
    });

    const count = (appointments ?? []).filter((a) => {
      const t = new Date(a.start_time);
      return t >= start && t <= end;
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
