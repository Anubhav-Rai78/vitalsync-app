import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

function calcAge(dob: string | null) {
  if (!dob) return "—";
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  let query = supabase
    .from("patients")
    .select("id, full_name, sex, dob, phone, created_at")
    .order("created_at", { ascending: false });

  if (searchParams.q) {
    query = query.ilike("full_name", `%${searchParams.q}%`);
  }

  const { data: patients } = await query;

  return (
    <div className="space-y-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
        <div>
          <h2 className="text-headline-lg text-on-surface">Patients</h2>
          <p className="text-body-sm text-on-surface-variant mt-xs">
            Manage your clinic&apos;s patient records.
          </p>
        </div>
        <Link
          href="/patients/new"
          className="flex items-center gap-xs px-lg h-10 bg-primary-container text-on-primary hover:bg-primary-container/90 rounded-lg text-label-md transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Add New Patient
        </Link>
      </div>

      <form className="bg-surface rounded-xl border border-outline-variant p-md flex flex-col lg:flex-row gap-md items-center justify-between">
        <div className="relative w-full lg:w-96">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            name="q"
            defaultValue={searchParams.q}
            className="w-full h-10 pl-10 pr-4 bg-background border border-outline-variant rounded-lg text-body-sm text-on-surface placeholder-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
            placeholder="Search patients by name..."
            type="text"
          />
        </div>
      </form>

      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Patient</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Sex</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Age</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Phone</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Registered</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-body-sm text-on-surface">
              {(patients ?? []).map((p) => (
                <tr key={p.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="py-sm px-md">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center text-label-sm">
                        {p.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium">{p.full_name}</span>
                    </div>
                  </td>
                  <td className="py-sm px-md capitalize">{p.sex ?? "—"}</td>
                  <td className="py-sm px-md">{calcAge(p.dob)}</td>
                  <td className="py-sm px-md text-on-surface-variant">{p.phone ?? "—"}</td>
                  <td className="py-sm px-md text-on-surface-variant">{formatDate(p.created_at)}</td>
                  <td className="py-sm px-md text-right">
                    <Link href={`/patients/${p.id}`} className="text-primary hover:underline text-label-md">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {(!patients || patients.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-lg px-md text-center text-on-surface-variant">
                    No patients yet.{" "}
                    <Link href="/patients/new" className="text-primary hover:underline">
                      Add your first patient
                    </Link>
                    .
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
