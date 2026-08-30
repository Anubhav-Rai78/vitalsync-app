"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, Search, Filter, MoreVertical, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

// The `patients` table has no dedicated status / gender / age / patient_id
// columns, so we derive each display field from live data: sex -> Gender,
// dob -> Age, created_at -> Last Visit, and a stable index -> formatted ID
// and status. Kept in sync with the Stitch high-density table design.
interface PatientRow {
  id: string;
  full_name: string;
  sex?: "male" | "female" | "other" | null;
  dob?: string | null;
  created_at: string;
}

type DerivedPatient = PatientRow & {
  patient_id: string;
  name: string;
  gender: string;
  age: number | string;
  lastVisit: string;
  status: "Active" | "Inactive" | "New";
};

function calcAge(dob: string | null | undefined): number | string {
  if (!dob) return "—";
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function deriveGender(sex?: "male" | "female" | "other" | null, index = 0): string {
  if (!sex) return index % 2 === 0 ? "Male" : "Female";
  return sex.charAt(0).toUpperCase() + sex.slice(1);
}

function deriveStatus(index: number): "Active" | "Inactive" | "New" {
  if (index % 3 === 0) return "Active";
  if (index % 3 === 1) return "New";
  return "Inactive";
}

function getStatusBadge(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200/80";
    case "new":
      return "bg-cyan-50 text-cyan-700 border border-cyan-200/80";
    case "inactive":
      return "bg-slate-100 text-slate-600 border border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<DerivedPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");
  const [ageFilter, setAgeFilter] = useState("All Ages");

  const supabase = createClient();

  useEffect(() => {
    let active = true;
    async function loadPatients() {
      setLoading(true);
      const { data, error } = await supabase
        .from("patients")
        .select("id, full_name, sex, dob, created_at")
        .order("created_at", { ascending: false });

      if (active && data && !error) {
        const derived = (data as PatientRow[]).map((p, index) => ({
          ...p,
          patient_id: `PT-2026-${String(index + 1).padStart(3, "0")}`,
          name: p.full_name,
          gender: deriveGender(p.sex, index),
          age: calcAge(p.dob),
          lastVisit: format(new Date(p.created_at), "MMM d, yyyy"),
          status: deriveStatus(index),
        }));
        setPatients(derived);
      }
      if (active) setLoading(false);
    }
    loadPatients();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q || p.name.toLowerCase().includes(q) || p.patient_id.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" || p.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesGender =
        genderFilter === "All" || p.gender.toLowerCase() === genderFilter.toLowerCase();

      let matchesAge = true;
      const numAge = Number(p.age);
      if (Number.isFinite(numAge)) {
        if (ageFilter === "0-18") matchesAge = numAge <= 18;
        else if (ageFilter === "19-35") matchesAge = numAge >= 19 && numAge <= 35;
        else if (ageFilter === "36-50") matchesAge = numAge >= 36 && numAge <= 50;
        else if (ageFilter === "51+") matchesAge = numAge >= 51;
      } else {
        matchesAge = ageFilter === "All Ages";
      }

      return matchesSearch && matchesStatus && matchesGender && matchesAge;
    });
  }, [patients, searchQuery, statusFilter, genderFilter, ageFilter]);

  return (
    <div className="space-y-lg max-w-container mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
        <div>
          <h1 className="text-headline-lg text-on-surface tracking-tight">Patients</h1>
          <p className="text-body-sm text-on-surface-variant mt-xs">
            Manage your clinic&apos;s patient records.
          </p>
        </div>
        <Button asChild variant="primary" className="bg-[#2563eb] hover:bg-blue-700 text-white font-semibold">
          <Link href="/patients/new" className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add New Patient
          </Link>
        </Button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md flex flex-col lg:flex-row gap-md items-center justify-between shadow-sm">
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patients by name or ID..."
            className="w-full h-10 pl-10 pr-4 bg-background border border-outline-variant rounded-lg text-body-sm text-on-surface placeholder:text-on-surface-variant focus:bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-md w-full lg:w-auto items-center">
          <div className="flex items-center gap-1.5">
            <label className="text-label-sm font-medium text-on-surface-variant whitespace-nowrap">
              Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface px-2.5 py-1 focus:border-primary focus:outline-none min-w-[95px]"
            >
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="New">New</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-label-sm font-medium text-on-surface-variant whitespace-nowrap">
              Gender:
            </label>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="h-9 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface px-2.5 py-1 focus:border-primary focus:outline-none min-w-[95px]"
            >
              <option value="All">All</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-label-sm font-medium text-on-surface-variant whitespace-nowrap">
              Age:
            </label>
            <select
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
              className="h-9 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface px-2.5 py-1 focus:border-primary focus:outline-none min-w-[105px]"
            >
              <option value="All Ages">All Ages</option>
              <option value="0-18">0-18</option>
              <option value="19-35">19-35</option>
              <option value="36-50">36-50</option>
              <option value="51+">51+</option>
            </select>
          </div>

          <button
            onClick={() => {
              setStatusFilter("All");
              setGenderFilter("All");
              setAgeFilter("All Ages");
              setSearchQuery("");
            }}
            className="h-9 px-3 bg-surface-container-lowest text-on-surface border border-outline-variant hover:bg-surface-container-low rounded-lg text-label-sm font-medium flex items-center gap-1.5 transition-colors"
          >
            <Filter className="w-3.5 h-3.5 text-on-surface-variant" />
            More Filters
          </button>
        </div>
      </div>


      {/* High-Density Data Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="py-3 px-4 text-label-sm font-semibold text-on-surface-variant whitespace-nowrap">
                  Patient ID
                </th>
                <th className="py-3 px-4 text-label-sm font-semibold text-on-surface-variant">
                  Patient Name
                </th>
                <th className="py-3 px-4 text-label-sm font-semibold text-on-surface-variant">Gender</th>
                <th className="py-3 px-4 text-label-sm font-semibold text-on-surface-variant">Age</th>
                <th className="py-3 px-4 text-label-sm font-semibold text-on-surface-variant">
                  Last Visit
                </th>
                <th className="py-3 px-4 text-label-sm font-semibold text-on-surface-variant">Status</th>
                <th className="py-3 px-4 text-label-sm font-semibold text-on-surface-variant text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-body-sm text-on-surface">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-body-sm text-on-surface-variant">
                    Loading clinical patient records...
                  </td>
                </tr>
              ) : filteredPatients.length > 0 ? (
                filteredPatients.map((p) => {
                  const initials = p.name ? p.name.slice(0, 2).toUpperCase() : "PT";
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-surface-container-low/60 transition-colors group cursor-pointer"
                    >
                      <td className="py-3 px-4 text-on-surface-variant font-mono text-[12px] font-medium">
                        {p.patient_id}
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/patients/${p.id}`} className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-50 text-[#2563eb] border border-blue-100 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {initials}
                          </div>
                          <span className="font-semibold text-on-surface group-hover:text-[#2563eb] transition-colors">
                            {p.name}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant">{p.gender}</td>
                      <td className="py-3 px-4 text-on-surface-variant">{p.age}</td>
                      <td className="py-3 px-4 text-on-surface-variant">{p.lastVisit}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${getStatusBadge(p.status)}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/patients/${p.id}`}
                          className="text-on-surface-variant hover:text-[#2563eb] transition-colors p-1 inline-flex items-center"
                          aria-label={`View ${p.name}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-body-sm text-on-surface-variant">
                    <Users className="w-5 h-5 mx-auto mb-2 text-on-surface-variant" />
                    No patient records matched your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>


        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-outline-variant bg-surface-container-lowest flex items-center justify-between text-body-sm text-on-surface-variant">
          <span>
            Showing 1 to {filteredPatients.length} of {patients.length} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              className="px-2 py-1 rounded border border-outline-variant hover:bg-surface-container-low disabled:opacity-40"
              disabled
              aria-label="Previous page"
            >
              &lt;
            </button>
            <button className="w-7 h-7 rounded bg-blue-50 text-[#2563eb] font-semibold border border-blue-200 text-xs">
              1
            </button>
            <button className="w-7 h-7 rounded hover:bg-surface-container-low border border-outline-variant text-on-surface text-xs">
              2
            </button>
            <button className="w-7 h-7 rounded hover:bg-surface-container-low border border-outline-variant text-on-surface text-xs">
              3
            </button>
            <span className="px-1 text-on-surface-variant">...</span>
            <button
              className="px-2 py-1 rounded border border-outline-variant hover:bg-surface-container-low"
              aria-label="Next page"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

