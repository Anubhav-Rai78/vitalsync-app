"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  Eye,
  Edit2,
  X,
  RotateCcw,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface DoctorItem {
  id: string;
  doctor_id_display: string;
  full_name: string;
  specialty: string;
  email: string;
  phone: string;
  room: string;
  license_no: string;
  is_active: boolean;
  status: "Active" | "On Leave";
  next_available: string;
}

const ITEMS_PER_PAGE = 5;

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("any");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"name_asc" | "status">("name_asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Edit Modal State
  const [editingDoctor, setEditingDoctor] = useState<DoctorItem | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    specialty: "",
    phone: "",
    licenseNo: "",
    isActive: true,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const supabase = createClient();

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, specialty, phone, license_no, is_active, created_at")
        .eq("role", "doctor")
        .order("full_name", { ascending: true });

      if (data && !error) {
        const formatted: DoctorItem[] = data.map((doc: any, idx: number) => {
          const active = doc.is_active ?? true;
          return {
            id: doc.id,
            doctor_id_display: `MD-${1040 + idx * 7}`,
            full_name: doc.full_name?.startsWith("Dr.") ? doc.full_name : `Dr. ${doc.full_name || "Specialist"}`,
            specialty: doc.specialty || "General Medicine",
            email: `${(doc.full_name || "doctor").toLowerCase().replace(/[^a-z]/g, "")}@medflow.com`,
            phone: doc.phone || "+91 98201 54321",
            room: `Room ${102 + (idx % 6) * 5}`,
            license_no: doc.license_no || "KMC-99214",
            is_active: active,
            status: active ? "Active" : "On Leave",
            next_available: active ? "Today, 2:30 PM" : "Returns Oct 15, 2026",
          };
        });
        setDoctors(formatted);
      }
    } catch (err) {
      console.error("Error loading doctors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const filteredDoctors = useMemo(() => {
    const list = doctors.filter((doc) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        doc.full_name.toLowerCase().includes(q) ||
        doc.doctor_id_display.toLowerCase().includes(q) ||
        doc.specialty.toLowerCase().includes(q);

      const matchesSpecialty =
        specialtyFilter === "all" || doc.specialty.toLowerCase() === specialtyFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "all" || doc.status.toLowerCase() === statusFilter.toLowerCase();

      let matchesTime = true;
      if (timeFilter === "today") matchesTime = doc.status === "Active";

      return matchesSearch && matchesSpecialty && matchesStatus && matchesTime;
    });

    list.sort((a, b) => {
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return a.full_name.localeCompare(b.full_name);
    });

    return list;
  }, [doctors, searchQuery, specialtyFilter, statusFilter, timeFilter, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, specialtyFilter, statusFilter, timeFilter, sortBy]);

  const totalPages = Math.ceil(filteredDoctors.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const visibleDoctors = filteredDoctors.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getInitials = (name: string) => {
    return name
      .replace(/^Dr\.\s*/i, "")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const openEditModal = (doc: DoctorItem) => {
    setEditingDoctor(doc);
    setEditForm({
      fullName: doc.full_name.replace(/^Dr\.\s*/i, ""),
      specialty: doc.specialty,
      phone: doc.phone,
      licenseNo: doc.license_no,
      isActive: doc.is_active,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;
    setSavingEdit(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.fullName.trim(),
          specialty: editForm.specialty,
          phone: editForm.phone.trim(),
          license_no: editForm.licenseNo.trim(),
          is_active: editForm.isActive,
        })
        .eq("id", editingDoctor.id);

      if (!error) {
        setEditingDoctor(null);
        await loadDoctors();
      }
    } catch (err) {
      console.error("Save doctor error:", err);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="max-w-container-max mx-auto space-y-lg font-body-md text-body-md text-on-background pb-xxl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-on-surface">
            Doctors
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
            Manage your clinic&apos;s medical staff and specialties.
          </p>
        </div>
        <Button asChild className="bg-primary text-on-primary hover:bg-primary/90 font-label-md">
          <Link href="/doctors/new" className="flex items-center gap-xs">
            <Plus className="w-4 h-4" /> Add New Doctor
          </Link>
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm space-y-md">
        <div className="flex flex-col md:flex-row gap-md items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or ID..."
              className="w-full h-10 pl-10 pr-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-sm w-full md:w-auto">
            <div className="relative">
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="h-10 appearance-none pr-8 pl-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none cursor-pointer"
              >
                <option value="all">All Specialties</option>
                <option value="General Medicine">General Medicine</option>
                <option value="General Practice">General Practice</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Neurology">Neurology</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 appearance-none pr-8 pl-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="on leave">On Leave</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="h-10 appearance-none pr-8 pl-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none cursor-pointer"
              >
                <option value="any">Any time</option>
                <option value="today">Available Today</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={() => setShowMoreFilters(!showMoreFilters)}
              className={`h-10 px-3 flex items-center gap-xs rounded-lg border font-label-sm text-label-sm font-medium transition-colors ${showMoreFilters
                ? "bg-primary-container text-on-primary-container border-primary"
                : "bg-surface-container-low border-outline-variant text-on-surface hover:bg-surface-container"
                }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> More
            </button>
          </div>
        </div>

        {/* Collapsible Extended Filters */}
        {showMoreFilters && (
          <div className="pt-md border-t border-outline-variant/60 flex flex-wrap gap-md items-center bg-surface-container-low/50 p-md rounded-lg">
            <div className="flex items-center gap-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Sort By:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="h-9 appearance-none pr-8 pl-3 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none cursor-pointer"
                >
                  <option value="name_asc">Name: A to Z</option>
                  <option value="status">Status (Active first)</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
              </div>
            </div>

            <button
              onClick={() => {
                setSearchQuery("");
                setSpecialtyFilter("all");
                setStatusFilter("all");
                setTimeFilter("any");
                setSortBy("name_asc");
              }}
              className="h-9 px-3 flex items-center gap-1 rounded-lg border border-outline-variant text-on-surface-variant hover:text-error text-label-sm transition-colors ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Doctors Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-body-sm text-body-sm">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant font-label-sm text-label-sm">
                <th className="py-sm px-md font-semibold whitespace-nowrap">Doctor Name</th>
                <th className="py-sm px-md font-semibold whitespace-nowrap">Specialty</th>
                <th className="py-sm px-md font-semibold whitespace-nowrap">Contact Information</th>
                <th className="py-sm px-md font-semibold whitespace-nowrap">Status</th>
                <th className="py-sm px-md font-semibold whitespace-nowrap">Next Available</th>
                <th className="py-sm px-md font-semibold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                    Loading clinical staff records...
                  </td>
                </tr>
              ) : visibleDoctors.length > 0 ? (
                visibleDoctors.map((doc) => (
                  <tr key={doc.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-md px-md">
                      <Link
                        href={`/doctors/${doc.id}`}
                        className="flex items-center gap-sm group"
                      >
                        <div className="w-9 h-9 rounded-full bg-primary-fixed text-on-primary-fixed font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(doc.full_name)}
                        </div>
                        <div>
                          <div className="font-semibold text-on-surface group-hover:text-primary transition-colors">
                            {doc.full_name}
                          </div>
                          <div className="font-mono text-[11px] text-on-surface-variant">
                            ID: {doc.doctor_id_display}
                          </div>
                        </div>
                      </Link>
                    </td>

                    <td className="py-md px-md">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-surface-container-high text-on-surface border border-outline-variant">
                        {doc.specialty}
                      </span>
                    </td>

                    <td className="py-md px-md">
                      <div className="text-on-surface font-medium">{doc.email}</div>
                      <div className="text-on-surface-variant text-[12px]">{doc.phone}</div>
                    </td>

                    <td className="py-md px-md">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium ${doc.status === "Active"
                          ? "bg-secondary-container/20 text-secondary border border-secondary-container/50"
                          : "bg-surface-container-high text-on-surface-variant border border-outline-variant"
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${doc.status === "Active" ? "bg-secondary" : "bg-on-surface-variant"
                            }`}
                        />
                        {doc.status}
                      </span>
                    </td>

                    <td className="py-md px-md">
                      <div className="text-on-surface font-medium">{doc.next_available}</div>
                      <div className="text-on-surface-variant text-[12px]">{doc.room}</div>
                    </td>

                    <td className="py-md px-md text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/doctors/${doc.id}`}
                          className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container-high transition-colors"
                          title="View Doctor Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEditModal(doc)}
                          className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container-high transition-colors"
                          title="Edit Doctor Information"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-on-surface-variant">
                    No doctor records match the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Controls */}
        <div className="px-md py-sm border-t border-outline-variant bg-surface-container-lowest flex items-center justify-between">
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Showing{" "}
            <span className="font-medium text-on-surface">
              {filteredDoctors.length === 0 ? 0 : startIndex + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-on-surface">
              {Math.min(startIndex + ITEMS_PER_PAGE, filteredDoctors.length)}
            </span>{" "}
            of <span className="font-medium text-on-surface">{filteredDoctors.length}</span> Doctors
          </span>

          <div className="flex items-center gap-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-outline-variant rounded bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setCurrentPage(n)}
                className={`min-w-[32px] h-8 px-2 rounded font-label-sm text-label-sm font-semibold transition-colors ${currentPage === n
                  ? "bg-primary text-on-primary shadow-xs"
                  : "border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low"
                  }`}
              >
                {n}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-outline-variant rounded bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Doctor Modal */}
      {editingDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/25 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg w-full max-w-lg p-lg space-y-md">
            <div className="flex items-center justify-between border-b border-outline-variant pb-sm">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Edit Doctor Profile</h3>
              <button
                onClick={() => setEditingDoctor(null)}
                className="p-1 text-on-surface-variant hover:text-on-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-md font-body-sm text-body-sm">
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface mb-xs">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface mb-xs">Specialty</label>
                  <div className="relative">
                    <select
                      value={editForm.specialty}
                      onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                      className="w-full h-10 appearance-none pr-8 pl-3 bg-surface-container-low border border-outline-variant rounded-lg outline-none cursor-pointer"
                    >
                      <option value="General Medicine">General Medicine</option>
                      <option value="General Practice">General Practice</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Neurology">Neurology</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface mb-xs">Status</label>
                  <div className="relative">
                    <select
                      value={editForm.isActive ? "active" : "inactive"}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === "active" })}
                      className="w-full h-10 appearance-none pr-8 pl-3 bg-surface-container-low border border-outline-variant rounded-lg outline-none cursor-pointer"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">On Leave</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-label-sm text-label-sm text-on-surface mb-xs">Phone Number</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-label-sm text-label-sm text-on-surface mb-xs">License Number</label>
                <input
                  type="text"
                  value={editForm.licenseNo}
                  onChange={(e) => setEditForm({ ...editForm, licenseNo: e.target.value })}
                  className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-sm pt-sm border-t border-outline-variant">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingDoctor(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingEdit}
                  className="bg-primary text-on-primary"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
