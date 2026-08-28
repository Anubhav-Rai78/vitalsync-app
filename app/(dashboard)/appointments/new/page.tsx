import { createClient } from "@/lib/supabase/server";
import { BookAppointmentForm } from "@/components/modules/book-appointment-form";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: { patient?: string; date?: string };
}) {
  const supabase = createClient();
  const [{ data: patients }, { data: doctors }] = await Promise.all([
    supabase.from("patients").select("id, full_name").order("full_name"),
    supabase.from("profiles").select("id, full_name, specialty").eq("role", "doctor").order("full_name"),
  ]);

  return (
    <BookAppointmentForm
      patients={patients ?? []}
      doctors={doctors ?? []}
      preselectedPatientId={searchParams.patient}
      preselectedDate={searchParams.date}
    />
  );
}
