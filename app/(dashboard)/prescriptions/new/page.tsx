import { createClient } from "@/lib/supabase/server";
import { CreatePrescriptionForm } from "@/components/modules/create-prescription-form";

export default async function NewPrescriptionPage({
  searchParams,
}: {
  searchParams: { patient?: string };
}) {
  const supabase = createClient();
  const { data: patients } = await supabase.from("patients").select("id, full_name").order("full_name");

  return <CreatePrescriptionForm patients={patients ?? []} preselectedPatientId={searchParams.patient} />;
}
