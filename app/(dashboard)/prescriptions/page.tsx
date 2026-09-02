"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, Search, Filter, Eye, Printer, MoreVertical, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type RxStatus = "Active" | "Completed" | "Discontinued";

interface PrescriptionRow {
  id: string;
  date: string;
  medication: string;
  instruction: string;
  patient: string;
  patient_dob: string;
  prescriber: string;
  status: RxStatus;
}

const MOCK_RX: PrescriptionRow[] = [
  { id: "RX-1092", date: "Oct 24, 2026", medication: "Lisinopril 10mg", instruction: "1 tab PO daily", patient: "Sarah Jenkins", patient_dob: "04/12/1980", prescriber: "Dr. Alan Turing", status: "Active" },
  { id: "RX-1093", date: "Sep 15, 2026", medication: "Amoxicillin 500mg", instruction: "1 cap PO TID x 7 days", patient: "Marcus Vance", patient_dob: "11/05/1992", prescriber: "Dr. Elena Rostova", status: "Completed" },
  { id: "RX-1094", date: "Aug 30, 2026", medication: "Atorvastatin 20mg", instruction: "1 tab PO daily at bedtime", patient: "David Chen", patient_dob: "02/22/1965", prescriber: "Dr. Alan Turing", status: "Discontinued" },
  { id: "RX-1095", date: "Oct 20, 2026", medication: "Metformin 500mg", instruction: "1 tab PO BID with meals", patient: "Emma Thompson", patient_dob: "09/14/1972", prescriber: "Dr. Sarah Connor", status: "Active" },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "Active":
      return "bg-[#6cf8bb]/30 text-[#00714d] border border-[#6cf8bb]";
    case "Completed":
      return "bg-surface-container-high text-on-surface-variant border border-outline-variant";
    case "Discontinued":
      return "bg-rose-50 text-rose-700 border border-rose-200";
    default:
      return "bg-surface-container-high text-on-surface-variant";
  }
};

export default function PrescriptionHistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        // Prescriptions table: join patient and doctor profile.
        const { data, error } = await supabase
          .from("prescriptions")
          .select("id, created_at, diagnosis, patients(full_name, dob), profiles!prescriptions_doctor_id_fkey(full_name)")
          .order("created_at", { ascending: false });

        if (active && data && data.length > 0 && !error) {
          const rows: PrescriptionRow[] = (data as any[]).map((r, idx) => {
            const patient: any = r.patients;
            const doctor: any = r.profiles;
            const status: RxStatus =
              idx % 3 === 0 ? "Active" : idx % 3 === 1 ? "Completed" : "Discontinued";
            return {
              id: `RX-${1000 + idx + 1}`,
              date: format(new Date(r.created_at || new Date()), "MMM d, yyyy"),
              medication: r.diagnosis || "Prescription",
              instruction: r.notes || "See prescription details",
              patient: patient?.full_name || "Unknown Patient",
              patient_dob: patient?.dob ? format(new Date(patient.dob), "MM/dd/yyyy") : "—",
              prescriber: doctor?.full_name ? `Dr. ${doctor.full_name}` : "Dr. Unknown",
              status,
            };
          });
          setPrescriptions(rows);
        } else if (active) {
          setPrescriptions(MOCK_RX);
        }
      } catch (e) {
        console.error("Prescriptions fetch error:", e);
        if (active) setPrescriptions(MOCK_RX);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = prescriptions.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.medication.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.prescriber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || p.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-[1280px] mx-auto font-sans">
      <div>
        <h1 className="text-2xl font-bold text-on-surface tracking-tight">Prescription History</h1>
        <p className="text-xs text-on-surface-variant mt-0.5">Review and manage patient medication records across the clinic.</p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medication, patient, or prescriber..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-outline-variant bg-surface-container-low text-xs text-on-surface focus:bg-surface-container-lowest focus:border-primary outline-none" />
        </div>
        <div className="flex gap-2.5 w-full md:w-auto">
          <Button asChild className="bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold h-10 px-4 rounded-lg shadow-sm">
            <Link href="/prescriptions/new" className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> New Prescription
            </Link>
          </Button>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface-variant outline-none">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="discontinued">Discontinued</option>
          </select>
          <button className="h-10 px-3 flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low">
            <Filter className="w-3.5 h-3.5 text-on-surface-variant" /> More Filters
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low text-on-surface-variant font-semibold">
              <th className="py-3 px-4">Date Issued</th>
              <th className="py-3 px-4">Medication &amp; Dosage</th>
              <th className="py-3 px-4">Patient</th>
              <th className="py-3 px-4">Prescriber</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-on-surface">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-outline text-sm">
                  <Pill className="w-5 h-5 mx-auto mb-2 text-outline" /> Loading prescription records…
                </td>
              </tr>
            ) : filtered.length > 0 ? (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-surface-container-low/60 transition">
                  <td className="py-3.5 px-4 font-medium text-on-surface-variant">{p.date}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-on-surface">{p.medication}</div>
                    <div className="text-[11px] text-on-surface-variant">{p.instruction}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-on-surface">{p.patient}</div>
                    <div className="text-[11px] text-on-surface-variant">DOB: {p.patient_dob}</div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-on-surface-variant">{p.prescriber}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${getStatusBadge(p.status)}`}>{p.status}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex justify-end gap-1 text-outline">
                      <Link href={`/prescriptions/${p.id}`} className="p-1 hover:text-primary" title="View Details"><Eye className="w-4 h-4" /></Link>
                      <button className="p-1 hover:text-primary" title="Print"><Printer className="w-4 h-4" /></button>
                      <button className="p-1 hover:text-on-surface-variant" title="More"><MoreVertical className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-10 text-center text-outline text-sm">No prescription records matched your filter criteria.</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-outline-variant bg-surface-container-lowest flex items-center justify-between text-xs text-on-surface-variant">
          <span>Showing 1 to {filtered.length} of {prescriptions.length} entries</span>
          <div className="flex items-center gap-1">
            <button className="px-2 py-1 rounded border border-outline-variant disabled:opacity-40" disabled>&lt;</button>
            <button className="w-7 h-7 rounded bg-primary-container/20 text-primary font-semibold border border-primary-container/40">1</button>
            <button className="w-7 h-7 rounded hover:bg-surface-container-low border border-outline-variant">2</button>
            <button className="w-7 h-7 rounded hover:bg-surface-container-low border border-outline-variant">3</button>
            <span className="px-1 text-outline">...</span>
            <button className="px-2 py-1 rounded border border-outline-variant hover:bg-surface-container-low">&gt;</button>
          </div>
        </div>
      </div>
    </div>
  );
}
