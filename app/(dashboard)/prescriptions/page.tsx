"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pill, AlertTriangle, Plus, Search, Filter } from "lucide-react";

interface Prescription {
  id: string;
  patientName: string;
  doctorName: string;
  medication: string;
  dosage: string;
  frequency: string;
  status: "active" | "dispensed" | "warning";
  warningText?: string;
  date: string;
}

const mockPrescriptions: Prescription[] = [
  {
    id: "RX-1092",
    patientName: "Aarav Sharma",
    doctorName: "Dr. Sarah Jenkins",
    medication: "Atorvastatin 20mg + Aspirin 75mg",
    dosage: "1 tab daily at bedtime",
    frequency: "Daily for 30 days",
    status: "active",
    date: "2026-08-28",
  },
  {
    id: "RX-1093",
    patientName: "Meera Patel",
    doctorName: "Dr. Arvind Patel",
    medication: "Amoxicillin 500mg",
    dosage: "1 capsule every 8 hours",
    frequency: "7 Days Course",
    status: "warning",
    warningText: "Patient has recorded mild Penicillin sensitivity note.",
    date: "2026-08-29",
  },
  {
    id: "RX-1094",
    patientName: "Kunal Ghosh",
    doctorName: "Dr. Marcus Vance",
    medication: "Ibuprofen 400mg",
    dosage: "1 tab post meals PRN",
    frequency: "5 Days",
    status: "dispensed",
    date: "2026-08-29",
  },
];

export default function PrescriptionHistoryPage() {
  const [prescriptions] = useState<Prescription[]>(mockPrescriptions);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-md font-display text-on-surface">Prescription Orders</h1>
          <p className="text-body-sm text-on-surface-variant">
            Dispense medications, review interaction alerts, and manage refill timelines
          </p>
        </div>

        <Button className="bg-primary text-white flex items-center gap-2" variant="primary">
          <Plus className="w-4 h-4" /> Issue New Prescription
        </Button>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-level-2">
        <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-outline" />
            <input
              type="text"
              placeholder="Search Rx ID, Patient, Drug..."
              className="w-full h-10 pl-9 pr-3 py-1.5 text-body-sm bg-surface-container-lowest border border-outline-variant rounded-lg"
            />
          </div>
          <Button variant="secondary" size="sm" className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5" /> Filter by Status
          </Button>
        </div>

        <div className="divide-y divide-outline-variant/60">
          {prescriptions.map((rx) => (
            <div key={rx.id} className="p-5 hover:bg-surface-container-low/40 transition">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-body-md text-on-surface">{rx.medication}</span>
                      <span className="text-xs font-mono text-outline">{rx.id}</span>
                      {rx.status === "warning" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-error-container text-on-error-container">
                          <AlertTriangle className="w-3 h-3" /> Interaction Risk
                        </span>
                      )}
                    </div>
                    <p className="text-body-sm text-on-surface-variant mt-1">
                      Patient: <strong className="text-on-surface">{rx.patientName}</strong> • Prescribed by {rx.doctorName}
                    </p>
                    <p className="text-xs text-outline mt-0.5">
                      Instructions: {rx.dosage} • Duration: {rx.frequency}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-outline block">{rx.date}</span>
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <Button variant="secondary" size="sm" className="text-xs h-8">
                      View EHR
                    </Button>
                    <Button size="sm" className="text-xs h-8" variant="primary">
                      Dispense
                    </Button>
                  </div>
                </div>
              </div>

              {rx.warningText && (
                <div className="mt-3 p-2.5 rounded-lg bg-error-container border border-error/20 text-xs text-on-error-container">
                  <strong>Clinical Notice:</strong> {rx.warningText}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
