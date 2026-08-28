import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function PrescriptionsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user!.id).single();

  const { data: prescriptions } = await supabase
    .from("prescriptions")
    .select("id, diagnosis, created_at, patients(full_name), profiles!prescriptions_doctor_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
        <div>
          <h2 className="text-headline-lg text-on-surface">Prescriptions</h2>
          <p className="text-body-sm text-on-surface-variant mt-xs">Prescription history across the clinic.</p>
        </div>
        {profile?.role === "doctor" && (
          <Link
            href="/prescriptions/new"
            className="flex items-center gap-xs px-lg h-10 bg-primary-container text-on-primary hover:bg-primary-container/90 rounded-lg text-label-md transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            New Prescription
          </Link>
        )}
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Patient</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Diagnosis</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Doctor</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-body-sm text-on-surface">
              {(prescriptions ?? []).map((p: any) => (
                <tr key={p.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="py-sm px-md">
                    <Link href={`/prescriptions/${p.id}`} className="font-medium hover:text-primary">
                      {p.patients?.full_name}
                    </Link>
                  </td>
                  <td className="py-sm px-md text-on-surface-variant">{p.diagnosis ?? "—"}</td>
                  <td className="py-sm px-md text-on-surface-variant">Dr. {p.profiles?.full_name}</td>
                  <td className="py-sm px-md text-on-surface-variant">{formatDate(p.created_at)}</td>
                </tr>
              ))}
              {(!prescriptions || prescriptions.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-lg px-md text-center text-on-surface-variant">
                    No prescriptions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
