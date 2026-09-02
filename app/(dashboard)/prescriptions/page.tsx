"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Eye,
  Printer,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  RotateCcw,
  Pill,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { jsPDF } from "jspdf";
import { formatDateIST, formatDateTimeIST } from "@/lib/date";

type RxStatus = "Active" | "Completed" | "Discontinued" | "Draft";

interface PrescriptionRow {
  id: string;
  real_id: string;
  patient_id: string;
  date: string;
  medication: string;
  dosage: string;
  patient: string;
  patient_dob: string;
  prescriber: string;
  status: RxStatus;
  diagnosis: string;
  items: { drug_name: string; dosage: string; frequency: string }[];
}

const ITEMS_PER_PAGE = 5;

const getStatusBadge = (status: RxStatus) => {
  switch (status) {
    case "Active":
      return "bg-secondary-container/20 text-secondary border border-secondary-container/50";
    case "Completed":
      return "bg-surface-container-high text-on-surface-variant border border-outline-variant";
    case "Discontinued":
      return "bg-error-container/40 text-on-error-container border border-error-container";
    case "Draft":
      return "bg-surface-variant text-on-surface-variant border border-outline-variant";
    default:
      return "bg-surface-container text-on-surface";
  }
};

export default function PrescriptionHistoryPage() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRx, setSelectedRx] = useState<PrescriptionRow | null>(null);

  const supabase = createClient();

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("prescriptions")
          .select(
            "id, created_at, diagnosis, status, patients(id, full_name, dob), profiles!prescriptions_doctor_id_fkey(full_name), prescription_items(drug_name, dosage, frequency)"
          )
          .order("created_at", { ascending: false });

        if (active && data && !error) {
          const rows: PrescriptionRow[] = (data as any[]).map((r) => {
            const items: { drug_name: string; dosage: string; frequency: string }[] =
              (r.prescription_items || []).map((it: any) => ({
                drug_name: it.drug_name || "",
                dosage: it.dosage || "",
                frequency: it.frequency || "",
              }));
            const first = items[0];
            const rawStatus = (r.status || "active").toLowerCase();
            const status: RxStatus =
              rawStatus === "completed"
                ? "Completed"
                : rawStatus === "discontinued"
                  ? "Discontinued"
                  : rawStatus === "draft"
                    ? "Draft"
                    : "Active";
            return {
              id: `RX-${1000 + r.id.slice(0, 4).charCodeAt(0)}`,
              real_id: r.id,
              patient_id: r.patients?.id || "",
              date: r.created_at ? formatDateIST(r.created_at) : "—",
              medication: first?.drug_name || r.diagnosis || "Prescription",
              dosage: first?.dosage ? `${first.dosage} · ${first.frequency || "as directed"}` : "See instructions",
              patient: r.patients?.full_name || "Unknown Patient",
              patient_dob: r.patients?.dob ? formatDateIST(r.patients.dob) : "—",
              prescriber: r.profiles?.full_name
                ? r.profiles.full_name.startsWith("Dr.")
                  ? r.profiles.full_name
                  : `Dr. ${r.profiles.full_name}`
                : "Dr. Unknown",
              status,
              diagnosis: r.diagnosis || "General Consultation",
              items,
            };
          });
          setPrescriptions(rows);
        }
      } catch (err) {
        console.error("Prescriptions query error:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return prescriptions.filter((rx) => {
      const matchesSearch =
        !q ||
        rx.medication.toLowerCase().includes(q) ||
        rx.patient.toLowerCase().includes(q) ||
        rx.prescriber.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" || rx.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [prescriptions, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const visible = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
  };

  const handlePrintPDF = useCallback((rx: PrescriptionRow) => {
    const doc = new jsPDF();
    let y = 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 74, 198);
    doc.text("MedFlow Clinic - Official Prescription", 14, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(67, 70, 85);
    doc.text(`Prescription ID: ${rx.id}`, 14, y);
    doc.text(`Date Issued: ${rx.date}`, 14, y + 6);
    doc.setDrawColor(195, 198, 215);
    doc.line(14, y + 10, 196, y + 10);
    y += 18;

    doc.setFont("helvetica", "bold");
    doc.text("Patient Information", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${rx.patient}`, 14, y + 6);
    doc.text(`DOB: ${rx.patient_dob}`, 14, y + 12);
    doc.setFont("helvetica", "bold");
    doc.text("Prescriber:", 120, y);
    doc.setFont("helvetica", "normal");
    doc.text(rx.prescriber, 120, y + 6);
    doc.text(`Diagnosis: ${rx.diagnosis}`, 120, y + 12);
    y += 22;
    doc.setDrawColor(195, 198, 215);
    doc.line(14, y, 196, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Rx Medication & Instructions", 14, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    if (rx.items.length > 0) {
      rx.items.forEach((it) => {
        doc.text(
          `• ${it.drug_name}${it.dosage ? ` ${it.dosage}` : ""}${it.frequency ? ` — ${it.frequency}` : ""
          }`,
          18,
          y
        );
        y += 7;
      });
    } else {
      doc.text(`• ${rx.medication} — ${rx.dosage}`, 18, y);
    }

    doc.save(`Prescription_${rx.id}.pdf`);
  }, []);

  return (
    <div className="max-w-container-max mx-auto space-y-lg font-body-md text-body-md text-on-background pb-xxl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Prescription History</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
            Review and manage patient medication records across the clinic.
          </p>
        </div>
        <Button asChild className="bg-primary text-on-primary hover:bg-primary/90 font-label-md">
          <Link className="flex items-center gap-xs" href="/prescriptions/new">
            <Plus className="w-4 h-4" /> New Prescription
          </Link>
        </Button>
      </div>

      {/* Filter bar */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm space-y-md">
        <div className="flex flex-col md:flex-row gap-md items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medication, patient, or prescriber..."
              className="w-full h-10 pl-10 pr-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-sm w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="discontinued">Discontinued</option>
              <option value="draft">Draft</option>
            </select>

            <button
              type="button"
              onClick={() => setShowMoreFilters(!showMoreFilters)}
              className={`h-10 px-3 flex items-center gap-xs rounded-lg border font-label-sm text-label-sm font-medium transition-colors ${showMoreFilters
                  ? "bg-primary-container text-on-primary-container border-primary"
                  : "bg-surface-container-low border-outline-variant text-on-surface"
                }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> More Filters
            </button>
          </div>
        </div>

        {showMoreFilters && (
          <div className="pt-md border-t border-outline-variant/60 flex items-center justify-between bg-surface-container-low/40 p-md rounded-lg">
            <span className="text-label-sm text-on-surface-variant">
              Showing clinic-wide prescription records.
            </span>
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-label-sm text-primary hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-body-sm text-body-sm">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant font-label-sm text-label-sm">
                <th className="py-sm px-md font-semibold whitespace-nowrap">Date Issued</th>
                <th className="py-sm px-md font-semibold whitespace-nowrap">Medication &amp; Dosage</th>
                <th className="py-sm px-md font-semibold whitespace-nowrap">Patient</th>
                <th className="py-sm px-md font-semibold whitespace-nowrap">Prescriber</th>
                <th className="py-sm px-md font-semibold whitespace-nowrap">Status</th>
                <th className="py-sm px-md font-semibold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                    <Pill className="w-5 h-5 mx-auto mb-2 text-outline" />
                    Loading prescription records...
                  </td>
                </tr>
              ) : visible.length > 0 ? (
                visible.map((rx) => (
                  <tr key={rx.real_id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-md px-md text-on-surface whitespace-nowrap font-mono">{rx.date}</td>
                    <td className="py-md px-md">
                      <div className="font-semibold text-on-surface">{rx.medication}</div>
                      <div className="text-on-surface-variant text-[12px]">{rx.dosage}</div>
                    </td>
                    <td className="py-md px-md">
                      <div className="font-medium text-on-surface">{rx.patient}</div>
                      <div className="text-on-surface-variant text-[12px]">DOB: {rx.patient_dob}</div>
                    </td>
                    <td className="py-md px-md text-on-surface whitespace-nowrap">{rx.prescriber}</td>
                    <td className="py-md px-md">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-[12px] font-semibold ${getStatusBadge(rx.status)}`}>
                        {rx.status}
                      </span>
                    </td>
                    <td className="py-md px-md text-right whitespace-nowrap">
                      <div className="flex justify-end items-center gap-1">
                        <button
                          onClick={() => setSelectedRx(rx)}
                          className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container-high"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <Link
                          className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container-high"
                          href={`/prescriptions/new?patientId=${encodeURIComponent(rx.patient_id)}&renew=${encodeURIComponent(rx.real_id)}`}
                          title="Renew Prescription"
                        >
                          <RotateCw className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handlePrintPDF(rx)}
                          className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container-high"
                          title="Print PDF"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-on-surface-variant">
                    No prescriptions match your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-md py-sm border-t border-outline-variant bg-surface-container-lowest flex items-center justify-between">
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Showing{" "}
            <span className="font-medium text-on-surface">{filtered.length === 0 ? 0 : startIndex + 1}</span> to{" "}
            <span className="font-medium text-on-surface">{Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)}</span> of{" "}
            <span className="font-medium text-on-surface">{filtered.length}</span> entries
          </span>
          <div className="flex items-center gap-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-outline-variant rounded bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setCurrentPage(n)}
                className={`min-w-[32px] h-8 px-2 rounded font-label-sm text-label-sm font-semibold transition-colors ${currentPage === n
                    ? "bg-primary text-on-primary shadow-xs"
                    : "border border-outline-variant bg-surface-container-lowest text-on-surface"
                  }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-outline-variant rounded bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Details modal */}
      {selectedRx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/25 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg w-full max-w-md p-lg space-y-md">
            <div className="flex justify-between items-center border-b border-outline-variant pb-sm">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                {selectedRx.id} Details
              </h3>
              <button onClick={() => setSelectedRx(null)} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-sm text-body-sm">
              <div>
                <span className="text-on-surface-variant text-label-sm block">Patient</span>
                <span className="font-semibold text-on-surface">{selectedRx.patient}</span>
              </div>
              <div>
                <span className="text-on-surface-variant text-label-sm block">Diagnosis</span>
                <span className="font-semibold text-on-surface">{selectedRx.diagnosis}</span>
              </div>
              <div>
                <span className="text-on-surface-variant text-label-sm block">Medication &amp; Dosing</span>
                {selectedRx.items.length > 0 ? (
                  selectedRx.items.map((it, i) => (
                    <div key={i} className="text-on-surface">
                      <span className="font-semibold">{it.drug_name}</span>
                      {it.dosage ? ` ${it.dosage}` : ""}
                      {it.frequency ? ` — ${it.frequency}` : ""}
                    </div>
                  ))
                ) : (
                  <span className="font-semibold text-on-surface">{selectedRx.medication}</span>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-sm border-t border-outline-variant">
              <Button variant="secondary" onClick={() => setSelectedRx(null)}>
                Close
              </Button>
              <Button
                onClick={() => handlePrintPDF(selectedRx)}
                className="bg-primary text-on-primary"
              >
                <Printer className="w-4 h-4" /> Print PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


