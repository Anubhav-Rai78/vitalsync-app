"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  AlertTriangle,
  Search,
  PlusCircle,
  FilePenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreatePrescriptionPage() {
  const router = useRouter();

  const [medication, setMedication] = useState("Atorvastatin");
  const [dosage, setDosage] = useState("40mg");
  const [frequency, setFrequency] = useState("Once daily (QD)");
  const [duration, setDuration] = useState("30 days");
  const [route, setRoute] = useState("Oral");
  const [refills, setRefills] = useState(3);
  const [instructions, setInstructions] = useState("Take one tablet daily at bedtime.");
  const [diagnosis, setDiagnosis] = useState("Hyperlipidemia (E78.5)");
  const [pharmacyNotes, setPharmacyNotes] = useState("");

  const handleFinalize = () => {
    router.push("/prescriptions");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans pb-24">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-slate-500 text-xs font-medium">
        <Link href="/appointments" className="hover:text-[#2563eb] transition">Appointments</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/appointments" className="hover:text-[#2563eb] transition">Cardiology Consultation</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-900 font-semibold">Create Prescription</span>
      </nav>

      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Prescription</h1>

      {/* Patient Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col sm:flex-row items-start justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center font-bold text-base shrink-0 border border-blue-100">
            MC
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Michael Chen</h2>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              <span>ID: PT-88921</span>
              <span>•</span>
              <span>45 yrs, Male</span>
            </div>
          </div>
        </div>
        <div className="bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-lg flex items-start gap-2.5 max-w-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-rose-700">Active Allergies</p>
            <p className="text-slate-800">Penicillin (Severe)</p>
          </div>
        </div>
      </div>

      {/* Prescription Form Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Medication Details</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">Search Medication</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input type="text" value={medication} onChange={(e) => setMedication(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs focus:border-[#2563eb] outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">Dosage</label>
                <input type="text" value={dosage} onChange={(e) => setDosage(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:border-[#2563eb] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">Frequency</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs focus:border-[#2563eb] outline-none bg-white">
                  <option>Once daily (QD)</option>
                  <option>Twice daily (BID)</option>
                  <option>Three times daily (TID)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">Duration</label>
                <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:border-[#2563eb] outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">Route</label>
                <select value={route} onChange={(e) => setRoute(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs focus:border-[#2563eb] outline-none bg-white">
                  <option>Oral</option>
                  <option>Intravenous (IV)</option>
                  <option>Topical</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">Refills Allowed</label>
                <input type="number" value={refills} onChange={(e) => setRefills(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:border-[#2563eb] outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">Patient Instructions</label>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setInstructions("Take with food.")}
                  className="px-2.5 py-1 bg-slate-100 rounded-full text-[11px] font-medium text-slate-600 hover:bg-slate-200">Take with food</button>
                <button type="button" onClick={() => setInstructions("Take at bedtime.")}
                  className="px-2.5 py-1 bg-slate-100 rounded-full text-[11px] font-medium text-slate-600 hover:bg-slate-200">Take at bedtime</button>
              </div>
              <input type="text" value={instructions} onChange={(e) => setInstructions(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:border-[#2563eb] outline-none" />
            </div>
          </div>
          <button className="w-full py-3 border border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold text-[#2563eb] hover:bg-blue-50 transition">
            <PlusCircle className="w-4 h-4" /> Add Another Medication
          </button>
        </div>

        {/* Sidebar Form Options */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2">
            <h3 className="text-xs font-bold text-slate-900">Diagnosis / Indication</h3>
            <select value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-slate-200 text-xs focus:border-[#2563eb] outline-none bg-white">
              <option>Hyperlipidemia (E78.5)</option>
              <option>Essential Hypertension (I10)</option>
            </select>
            <p className="text-[11px] text-slate-500 leading-normal">Links this prescription to the primary diagnosis for this encounter.</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2">
            <h3 className="text-xs font-bold text-slate-900">Notes for Pharmacist</h3>
            <textarea rows={4} value={pharmacyNotes} onChange={(e) => setPharmacyNotes(e.target.value)}
              placeholder="Enter specific instructions or warnings for dispensing pharmacist..."
              className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:border-[#2563eb] outline-none" />
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 right-0 left-60 bg-white border-t border-slate-200 p-4 flex justify-between items-center z-30 px-8 shadow-lg">
        <Button variant="secondary" size="sm" asChild>
          <Link href="/appointments">Cancel</Link>
        </Button>
        <div className="flex gap-2.5">
          <Button variant="secondary" size="sm">Save as Draft</Button>
          <Button size="sm" onClick={handleFinalize} className="bg-[#2563eb] hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-sm">
            <FilePenLine className="w-3.5 h-3.5" /> Finalize &amp; E-Sign
          </Button>
        </div>
      </div>
    </div>
  );
}
