import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DoctorsPage() {
  const supabase = createClient();
  const { data: doctors } = await supabase
    .from("profiles")
    .select("id, full_name, specialty, phone, avatar_url, is_active")
    .eq("role", "doctor")
    .order("full_name");

  return (
    <div className="space-y-lg">
      <div>
        <h2 className="text-headline-lg text-on-surface">Doctors</h2>
        <p className="text-body-sm text-on-surface-variant mt-xs">Clinical staff on your team.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(doctors ?? []).map((doc) => (
          <Link
            key={doc.id}
            href={`/doctors/${doc.id}`}
            className="bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-lg hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-4 mb-md">
              {doc.avatar_url ? (
                <img src={doc.avatar_url} alt={doc.full_name} className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-headline-sm">
                  {doc.full_name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-body-md font-medium text-on-surface">Dr. {doc.full_name}</p>
                <p className="text-label-sm text-on-surface-variant">{doc.specialty ?? "General Practice"}</p>
              </div>
            </div>
            <p className="text-body-sm text-on-surface-variant">{doc.phone ?? "No phone on file"}</p>
            <span
              className={`inline-flex mt-3 items-center px-2.5 py-0.5 rounded-full text-label-sm ${
                doc.is_active ? "bg-secondary-container/40 text-secondary" : "bg-surface-container text-on-surface-variant"
              }`}
            >
              {doc.is_active ? "Active" : "Inactive"}
            </span>
          </Link>
        ))}
        {(!doctors || doctors.length === 0) && (
          <p className="text-body-sm text-on-surface-variant">
            No doctors added yet. Invite one from Settings → Staff.
          </p>
        )}
      </div>
    </div>
  );
}
