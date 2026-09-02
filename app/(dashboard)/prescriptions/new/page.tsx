import { createClient } from "@/lib/supabase/server";
import { CreatePrescriptionForm } from "@/components/modules/create-prescription-form";

export default async function NewPrescriptionPage({
  searchParams,
}: {
  searchParams: { patient?: string; patientId?: string; appointmentId?: string };
}) {
  const supabase = createClient();
  const { data: patients } = await supabase
    .from("patients")
    .select("id, full_name")
    .order("full_name");

  // Accept both ?patientId= and ?patient= (the appointment detail uses patientId;
  // other flows may use ?patient= as a legacy parameter).
  const preselectedId = searchParams.patientId ?? searchParams.patient ?? undefined;

  return (
    <CreatePrescriptionForm
      patients={patients ?? []}
      preselectedPatientId={preselectedId}
    />
  );
}
