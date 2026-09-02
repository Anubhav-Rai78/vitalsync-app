"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  AlertTriangle,
  PlusCircle,
  PenLine,
  Trash2,
  Search,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import {
  createPrescriptionAction,
  type PrescriptionItemInput,
  type RxStatus,
} from "@/app/(dashboard)/prescriptions/actions";

interface PatientOption {
  id: string;
  full_name: string;
}

export function CreatePrescriptionForm({
  patients,
  preselectedPatientId,
  presetPatientName,
  appointmentId,
  renewId,
}: {
  patients: PatientOption[];
  preselectedPatientId?: string;
  presetPatientName?: string;
  appointmentId?: string;
  renewId?: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [selectedPatientId, setSelectedPatientId] = useState(preselectedPatientId ?? "");
  const [patientData, setPatientData] = useState<{
    full_name: string;
    dob: string | null;
    sex: string | null;
    allergies: string | null;
  } | null>(null);

  const [medications, setMedications] = useState<PrescriptionItemInput[]>([
    {
      drugName: "",
      dosage: "",
      frequency: "Once daily (QD)",
      duration: "10 days",
      route: "Oral",
      refills: 0,
      instructions: "",
    },
  ]);
  const [diagnosis, setDiagnosis] = useState("General Consultation");
  const [pharmacistNotes, setPharmacistNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPatientId) {
      setPatientData(null);
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("patients")
        .select("full_name, dob, sex, allergies")
        .eq("id", selectedPatientId)
        .single();
      if (active && data) {
        setPatientData({
          full_name: data.full_name,
          dob: data.dob,
          sex: data.sex,
          allergies: data.allergies,
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedPatientId, supabase]);

  const displayName = patientData?.full_name || presetPatientName || "";

  const patientMeta = useMemo(() => {
    const dob = patientData?.dob;
    const age = dob ? new Date().getFullYear() - new Date(dob).getFullYear() : null;
    const sex = patientData?.sex
      ? patientData.sex.charAt(0).toUpperCase() + patientData.sex.slice(1)
      : null;
    return { age, sex };
  }, [patientData]);

  const addMedication = () => {
    setMedications((prev) => [
      ...prev,
      {
        drugName: "",
        dosage: "",
        frequency: "Once daily (QD)",
        duration: "10 days",
        route: "Oral",
        refills: 0,
        instructions: "",
      },
    ]);
  };

  const removeMedication = (index: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMedication = (
    index: number,
    field: keyof PrescriptionItemInput,
    value: string | number | undefined
  ) => {
    setMedications((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const applyInstructionPreset = (index: number, text: string) => {
    setMedications((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const current = item.instructions?.trim() || "";
        return { ...item, instructions: current ? `${current} ${text}.` : `${text}.` };
      })
    );
  };

  const handleSubmit = async (status: RxStatus) => {
    if (!selectedPatientId) {
      setErrorMessage("Please select a patient before saving.");
      return;
    }
    if (medications.some((m) => !m.drugName.trim())) {
      setErrorMessage("Please specify the drug name for every medication row.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    const res = await createPrescriptionAction({
      patientId: selectedPatientId,
      appointmentId: appointmentId || undefined,
      diagnosis,
      notes: pharmacistNotes,
      status,
      items: medications,
    });

    if ("error" in res && res.error) {
      setErrorMessage(res.error);
      setSaving(false);
      return;
    }

    router.push("/prescriptions");
    router.refresh();
  };

  return (
    <div className="max-w-container-max mx-auto space-y-lg font-body-md text-body-md text-on-background pb-32">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
        <Link className="hover:text-primary transition-colors" href="/appointments">
          Appointments
        </Link>
        <ChevronRight className="w-4 h-4 text-outline" />
        <Link className="hover:text-primary transition-colors" href="/prescriptions">
          Prescriptions
        </Link>
        <ChevronRight className="w-4 h-4 text-outline" />
        <span className="text-on-surface font-semibold">Create Prescription</span>
      </nav>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Create Prescription</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
            Compose a multi-item medication order for the selected patient.
          </p>
        </div>
        {renewId && (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary-container/20 text-secondary border border-secondary/30 font-label-sm text-label-sm font-semibold w-fit">
            Renewing source RX
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="p-md rounded-xl bg-error-container text-on-error-container border border-error text-body-sm">
          {errorMessage}
        </div>
      )}

      {/* Patient info card (optional allergy alert) */}
      {displayName && (
        <div className="bg-surface rounded-xl border border-outline-variant p-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-md shadow-xs">
          <div className="flex items-center gap-md">
            <div className="w-14 h-14 rounded-full bg-primary-container/20 text-primary flex items-center justify-center font-bold text-lg shrink-0">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                {displayName}
              </h2>
              <div className="flex items-center gap-4 text-on-surface-variant text-body-sm mt-0.5">
                <span>
                  Patient ID: {selectedPatientId ? selectedPatientId.slice(0, 6).toUpperCase() : "—"}
                </span>
                {patientMeta.age != null && (
                  <>
                    <span className="text-outline">•</span>
                    <span>
                      {patientMeta.age} yrs{patientMeta.sex ? `, ${patientMeta.sex}` : ""}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {patientData?.allergies ? (
            <div className="bg-error-container/20 border border-error-container/60 px-4 py-2 rounded-lg flex items-start gap-2.5 max-w-sm">
              <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
              <div>
                <p className="font-label-sm text-label-sm text-error font-bold">Active Allergies</p>
                <p className="font-body-sm text-body-sm text-on-surface">{patientData.allergies}</p>
              </div>
            </div>
          ) : (
            <div className="bg-secondary-container/20 border border-secondary-container/50 px-4 py-2 rounded-lg flex items-center gap-2.5 max-w-sm">
              <User className="w-4 h-4 text-secondary shrink-0" />
              <p className="font-label-sm text-label-sm text-on-surface">
                No known allergies on file.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Patient picker (only shown when the patient wasn't pre-selected) */}
      {!preselectedPatientId && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
          <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">
            Assign Patient *
          </label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="w-full md:w-96 h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none cursor-pointer"
          >
            <option value="">-- Select Patient --</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg items-start">
        {/* Left: medication rows */}
        <div className="lg:col-span-2 space-y-md">
          {medications.map((item, idx) => (
            <div
              key={idx}
              className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm space-y-md relative"
            >
              <div className="flex justify-between items-center border-b border-outline-variant pb-2">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Medication #{idx + 1}
                </h3>
                {medications.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMedication(idx)}
                    className="text-error hover:bg-error-container/20 p-1.5 rounded-lg text-label-sm flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                )}
              </div>

              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-xs">
                  Drug Name *
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={item.drugName}
                    onChange={(e) => updateMedication(idx, "drugName", e.target.value)}
                    placeholder="e.g. Amlodipine"
                    className="w-full h-10 pl-10 pr-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-xs">Dosage</label>
                  <input
                    type="text"
                    value={item.dosage}
                    onChange={(e) => updateMedication(idx, "dosage", e.target.value)}
                    placeholder="5 mg"
                    className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-xs">Frequency</label>
                  <select
                    value={item.frequency}
                    onChange={(e) => updateMedication(idx, "frequency", e.target.value)}
                    className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none cursor-pointer"
                  >
                    <option value="Once daily (QD)">Once daily (QD)</option>
                    <option value="Twice daily (BID)">Twice daily (BID)</option>
                    <option value="Three times daily (TID)">Three times daily (TID)</option>
                    <option value="As needed (PRN)">As needed (PRN)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-xs">Duration</label>
                  <input
                    type="text"
                    value={item.duration}
                    onChange={(e) => updateMedication(idx, "duration", e.target.value)}
                    placeholder="30 days"
                    className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-xs">Route</label>
                  <select
                    value={item.route || "Oral"}
                    onChange={(e) => updateMedication(idx, "route", e.target.value)}
                    className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none cursor-pointer"
                  >
                    <option value="Oral">Oral</option>
                    <option value="Intravenous (IV)">Intravenous (IV)</option>
                    <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                    <option value="Topical">Topical</option>
                    <option value="Subcutaneous">Subcutaneous</option>
                  </select>
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-xs">Refills</label>
                  <input
                    type="number"
                    min={0}
                    value={item.refills ?? 0}
                    onChange={(e) => updateMedication(idx, "refills", Number(e.target.value))}
                    className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-xs">
                  Patient Instructions
                </label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => applyInstructionPreset(idx, "Take with food")}
                    className="px-3 py-1 bg-surface-container-high rounded-full font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-variant transition-colors"
                  >
                    Take with food
                  </button>
                  <button
                    type="button"
                    onClick={() => applyInstructionPreset(idx, "Take at bedtime")}
                    className="px-3 py-1 bg-surface-container-high rounded-full font-label-sm text-label-sm text-on-surface-variant hover:bg-surface-variant transition-colors"
                  >
                    Take at bedtime
                  </button>
                </div>
                <input
                  type="text"
                  value={item.instructions}
                  onChange={(e) => updateMedication(idx, "instructions", e.target.value)}
                  placeholder="e.g. Take one tablet daily at bedtime."
                  className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none focus:border-primary"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addMedication}
            className="w-full py-3.5 border-2 border-dashed border-outline-variant rounded-xl flex items-center justify-center gap-2 text-primary font-label-md hover:bg-primary-container/10 transition-colors"
          >
            <PlusCircle className="w-5 h-5" /> Add Another Medication
          </button>
        </div>

        {/* Right: diagnosis + notes */}
        <div className="space-y-md">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm space-y-xs">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">
              Diagnosis / Indication
            </h3>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Essential Hypertension (I10)"
              className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm space-y-xs">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">
              Notes for Pharmacist
            </h3>
            <textarea
              rows={5}
              value={pharmacistNotes}
              onChange={(e) => setPharmacistNotes(e.target.value)}
              placeholder="Enter special instructions for the dispensing pharmacist..."
              className="w-full p-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none focus:border-primary resize-none"
            />
          </div>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 right-0 left-60 bg-surface-container-lowest border-t border-outline-variant p-4 flex justify-between items-center z-30 px-lg shadow-lg">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/prescriptions")}
        >
          Cancel
        </Button>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => handleSubmit("draft")}
          >
            {saving ? "Saving…" : "Save as Draft"}
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit("active")}
            className="bg-primary text-on-primary flex items-center gap-2"
          >
            <PenLine className="w-4 h-4" />
            {saving ? "Signing…" : "Finalize & E-Sign"}
          </Button>
        </div>
      </div>
    </div>
  );
}



