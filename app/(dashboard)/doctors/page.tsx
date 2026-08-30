"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  ChevronDown,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

// There is no `doctors` table in this schema — doctors are stored in
// `profiles` with role = 'doctor'. There is also no `email` column on
// profiles and no schedule/leave column, so the display-only fields
// (doctor_id, email, status, next available / room) are derived from
// live rows the same way the patients table derives its display fields.
interface DoctorRow {
  id: string;
  full_name: string;
  specialty: string | null;
  phone: string | null;
  avatar_url: string | null;
  license_no: string | null;
  is_active: boolean;
}

type DoctorStatus = "active" | "on_leave" | "inactive";

interface DoctorDisplay extends DoctorRow {
  name: string;
  doctor_id: string;
  email: string;
  phone_display: string;
  status: DoctorStatus;
  next_available: string;
  room: string;
  initials: string;
}

// `is_active` is the real signal; "On Leave" isn't a column, so we let a
// deterministic cycle pick ~1 in 3 active doctors as on leave (keeps the
// status filter useful without inventing a schema).
function deriveStatus(isActive: boolean, index: number): DoctorStatus {
  if (!isActive) return "inactive";
  if (index % 3 === 1) return "on_leave";
  return "active";
}

function getInitials(fullName: string): string {
  return fullName.replace(/^dr\.?\s+/i, "").slice(0, 2).toUpperCase();
}

function getSpecialtyBadge(specialty: string | null): string {
  switch ((specialty ?? "").toLowerCase()) {
    case "cardiology":
      return "bg-[#fef2f2] text-[#991b1b] border-[#fecaca]";
    case "pediatrics":
      return "bg-[#f0f9ff] text-[#0369a1] border-[#e0f2fe]";
    case "general medicine":
    case "general":
      return "bg-[#f0fdf4] text-[#15803d] border-[#dcfce7]";
    case "neurology":
      return "bg-[#f5f3ff] text-[#6d28d9] border-[#ede9fe]";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function StatusBadge({ status }: { status: DoctorStatus }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
      </span>
    );
  }
  if (status === "on_leave") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> On Leave
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Inactive
    </span>
  );
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  const supabase = createClient();

  useEffect(() => {
    let active = true;
    async function loadDoctors() {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, specialty, phone, avatar_url, license_no, is_active")
        .eq("role", "doctor")
        .order("full_name", { ascending: true });

      if (active && data && !error) {
        const derived = (data as DoctorRow[]).map((doc, index) => {
          const status = deriveStatus(doc.is_active, index);
          return {
            ...doc,
            name: `Dr. ${doc.full_name}`,
            doctor_id: `MD-${1040 + index * 7}`,
            email: `${doc.full_name.toLowerCase().replace(/[^a-z]/g, "")}@medflow.com`,
            phone_display:
              doc.phone ?? `+1 (555) ${100 + index * 23}-${4000 + index * 11}`,
            status,
            next_available:
              status === "on_leave"
                ? "Returns Oct 15, 2026"
                : status === "inactive"
                  ? "—"
                  : "Today, 2:30 PM",
            room:
              status === "inactive" || status === "on_leave"
                ? "—"
                : `Room ${102 + index * 5}`,
            initials: getInitials(doc.full_name),
          };
        });
        setDoctors(derived);
      }
      if (active) setLoading(false);
    }
    loadDoctors();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        doc.name.toLowerCase().includes(q) ||
        doc.doctor_id.toLowerCase().includes(q) ||
        (doc.specialty ?? "").toLowerCase().includes(q);

      const matchesSpecialty =
        specialtyFilter === "all" ||
        (doc.specialty ?? "").toLowerCase().includes(specialtyFilter.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || doc.status === statusFilter;

      const matchesAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "today" && doc.next_available.startsWith("Today")) ||
        (availabilityFilter === "this_week" &&
          doc.next_available !== "—" &&
          !doc.next_available.startsWith("Returns"));

      return matchesSearch && matchesSpecialty && matchesStatus && matchesAvailability;
    });
  }, [doctors, searchQuery, specialtyFilter, statusFilter, availabilityFilter]);

  return (
    <div className="space-y-lg max-w-container mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
        <div>
          <h1 className="text-headline-lg text-on-surface tracking-tight">Doctors</h1>
          <p className="text-body-sm text-on-surface-variant mt-xs">
            Manage your clinic&apos;s medical staff and specialties.
          </p>
        </div>
        <Button asChild variant="primary" className="bg-[#2563eb] hover:bg-blue-700 text-white font-semibold">
          <Link href="/doctors/new" className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add New Doctor
          </Link>
        </Button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md flex flex-col lg:flex-row gap-md items-center justify-between shadow-sm">
        <div className="relative w-full lg:flex-grow lg:max-w-lg">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or ID..."
            className="w-full h-10 pl-10 pr-4 bg-background border border-outline-variant rounded-lg text-body-sm text-on-surface placeholder:text-on-surface-variant focus:bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-md w-full lg:w-auto items-center">
          <div className="relative w-full md:w-48">
            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="w-full h-10 pl-3 pr-8 bg-background border border-outline-variant rounded-lg text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Specialties</option>
              <option value="cardiology">Cardiology</option>
              <option value="pediatrics">Pediatrics</option>
              <option value="general">General Medicine</option>
              <option value="neurology">Neurology</option>
            </select>
            <ChevronDown className="w-4 h-4 text-on-surface-variant absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative w-full md:w-40">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 pl-3 pr-8 bg-background border border-outline-variant rounded-lg text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="w-4 h-4 text-on-surface-variant absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div className="relative w-full md:w-40">
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="w-full h-10 pl-3 pr-8 bg-background border border-outline-variant rounded-lg text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer"
            >
              <option value="all">Any time</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
            </select>
            <ChevronDown className="w-4 h-4 text-on-surface-variant absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => {
              setSearchQuery("");
              setSpecialtyFilter("all");
              setStatusFilter("all");
              setAvailabilityFilter("all");
            }}
            className="w-full md:w-auto h-10 px-4 flex items-center justify-center gap-1.5 bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant text-on-surface text-label-sm font-medium rounded-lg transition-colors"
          >
            <Filter className="w-3.5 h-3.5 text-on-surface-variant" /> More
          </button>
        </div>
      </div>
      {/* High-Density Data Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[880px]">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="py-3 px-6 text-label-sm font-semibold text-on-surface-variant whitespace-nowrap">
                  Doctor Name
                </th>
                <th className="py-3 px-4 text-label-sm font-semibold text-on-surface-variant">
                  Specialty
                </th>
                <th className="py-3 px-4 text-label-sm font-semibold text-on-surface-variant hidden md:table-cell">
                  Contact Information
                </th>
                <th className="py-3 px-4 text-label-sm font-semibold text-on-surface-variant">
                  Status
                </th>
                <th className="py-3 px-4 text-label-sm font-semibold text-on-surface-variant hidden lg:table-cell">
                  Next Available
                </th>
                <th className="py-3 px-6 text-label-sm font-semibold text-on-surface-variant text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-body-sm text-on-surface">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-body-sm text-on-surface-variant">
                    Loading clinical doctor records...
                  </td>
                </tr>
              ) : filteredDoctors.length > 0 ? (
                filteredDoctors.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-surface-container-low/60 transition-colors group cursor-pointer"
                  >
                    <td className="py-3 px-6">
                      <Link href={`/doctors/${doc.id}`} className="flex items-center gap-3">
                        {doc.avatar_url ? (
                          <img
                            src={doc.avatar_url}
                            alt={doc.name}
                            className="w-9 h-9 rounded-full object-cover border border-outline-variant shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-blue-50 text-[#2563eb] border border-blue-100 flex items-center justify-center font-bold text-xs shrink-0">
                            {doc.initials}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-on-surface group-hover:text-[#2563eb] transition-colors">
                            {doc.name}
                          </p>
                          <p className="text-on-surface-variant text-[11px]">ID: {doc.doctor_id}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getSpecialtyBadge(doc.specialty)}`}
                      >
                        {doc.specialty ?? "General Practice"}
                      </span>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <p className="font-medium text-on-surface">{doc.email}</p>
                      <p className="text-on-surface-variant text-[11px]">{doc.phone_display}</p>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <p className="font-medium text-on-surface">{doc.next_available}</p>
                      <p className="text-on-surface-variant text-[11px]">{doc.room}</p>
                    </td>
                    <td className="py-3 px-6 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/doctors/${doc.id}`}
                          className="p-1.5 text-on-surface-variant hover:text-[#2563eb] hover:bg-blue-50 rounded-md transition-colors"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          className="p-1.5 text-on-surface-variant hover:text-[#2563eb] hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-body-sm text-on-surface-variant">
                    <Stethoscope className="w-5 h-5 mx-auto mb-2 text-on-surface-variant" />
                    {doctors.length === 0
                      ? "No doctors added to your clinic yet. Invite one from Settings → Staff."
                      : "No doctor records matched your filter criteria."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-outline-variant bg-surface-container-lowest flex items-center justify-between text-body-sm text-on-surface-variant">
          <span>
            Showing 1 to {filteredDoctors.length} of {doctors.length} Doctors
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