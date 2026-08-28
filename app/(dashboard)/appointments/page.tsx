import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime } from "@/lib/utils";
import { AppointmentCalendar } from "@/components/modules/appointment-calendar";

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-surface-variant text-on-surface-variant",
  confirmed: "bg-primary-container/20 text-primary",
  completed: "bg-secondary-container/40 text-secondary",
  cancelled: "bg-error-container text-on-error-container",
  no_show: "bg-error-container text-on-error-container",
};

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: { view?: string };
}) {
  const currentView = searchParams.view || "list";
  const supabase = createClient();

  // Query a wider range of appointments (-30 to +90 days) for the calendar view
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, start_time, status, reason, patients(full_name), profiles!appointments_doctor_id_fkey(full_name)")
    .gte("start_time", startDate)
    .lte("start_time", endDate)
    .order("start_time", { ascending: true });

  // For the list view, filter to upcoming/recent appointments (last 24h onwards)
  const recentAndUpcomingApps = ((appointments as any[]) ?? []).filter((a: any) => {
    return new Date(a.start_time) >= new Date(Date.now() - 24 * 60 * 60 * 1000);
  }).slice(0, 50);

  return (
    <div className="space-y-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
        <div>
          <h2 className="text-headline-lg text-on-surface">Appointments</h2>
          <p className="text-body-sm text-on-surface-variant mt-xs">Upcoming and recent visits.</p>
        </div>
        <div className="flex items-center gap-sm">
          {/* View Toggle */}
          <div className="flex items-center bg-surface-container-low p-1 rounded-lg border border-outline-variant">
            <Link
              href="/appointments?view=list"
              className={`px-sm py-1.5 rounded-md text-label-md transition-colors flex items-center gap-1 ${currentView !== "calendar"
                  ? "bg-surface text-primary shadow-sm font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
              List
            </Link>
            <Link
              href="/appointments?view=calendar"
              className={`px-sm py-1.5 rounded-md text-label-md transition-colors flex items-center gap-1 ${currentView === "calendar"
                  ? "bg-surface text-primary shadow-sm font-semibold"
                  : "text-on-surface-variant hover:text-on-surface"
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              Calendar
            </Link>
          </div>

          <Link
            href="/appointments/new"
            className="flex items-center gap-xs px-lg h-10 bg-primary-container text-on-primary hover:bg-primary-container/90 rounded-lg text-label-md transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Book Appointment
          </Link>
        </div>
      </div>

      {currentView === "calendar" ? (
        <AppointmentCalendar initialAppointments={(appointments as any) ?? []} />
      ) : (
        <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Patient</th>
                  <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Doctor</th>
                  <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Reason</th>
                  <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Date &amp; Time</th>
                  <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-body-sm text-on-surface">
                {recentAndUpcomingApps.map((a: any) => (
                  <tr
                    key={a.id}
                    className="hover:bg-surface-container-lowest transition-colors cursor-pointer"
                  >
                    <td className="py-sm px-md">
                      <Link href={`/appointments/${a.id}`} className="font-medium hover:text-primary">
                        {a.patients?.full_name}
                      </Link>
                    </td>
                    <td className="py-sm px-md text-on-surface-variant">Dr. {a.profiles?.full_name}</td>
                    <td className="py-sm px-md text-on-surface-variant">{a.reason ?? "—"}</td>
                    <td className="py-sm px-md text-on-surface-variant">
                      {formatDate(a.start_time)} · {formatTime(a.start_time)}
                    </td>
                    <td className="py-sm px-md">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-sm capitalize ${STATUS_STYLES[a.status] ?? ""}`}>
                        {a.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentAndUpcomingApps.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-lg px-md text-center text-on-surface-variant">
                      No appointments scheduled.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}