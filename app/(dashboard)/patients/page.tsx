"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface PatientItem {
  id: string;
  patient_id_display: string;
  full_name: string;
  gender: string;
  age: number | string;
  last_visit: string;
  raw_created_at: string;
  allergies?: string | null;
  status: "Active" | "New" | "Inactive";
}

const ITEMS_PER_PAGE = 5;

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Primary filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState("all");

  // Extended "More Filters" state
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [dateRegisteredFilter, setDateRegisteredFilter] = useState("all");
  const [allergiesFilter, setAllergiesFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name_asc" | "age_desc">("newest");

  const [currentPage, setCurrentPage] = useState(1);

  const supabase = createClient();

  useEffect(() => {
    async function loadPatients() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("id, full_name, sex, dob, created_at, allergies")
          .order("created_at", { ascending: false });

        if (data && data.length > 0 && !error) {
          const formatted: PatientItem[] = data.map((p: any, idx: number) => {
            const birthYear = p.dob ? new Date(p.dob).getFullYear() : 1995;
            const computedAge = new Date().getFullYear() - birthYear;
            const genderLabel = p.sex
              ? p.sex.charAt(0).toUpperCase() + p.sex.slice(1)
              : "Other";

            const statusList: ("Active" | "New" | "Inactive")[] = ["Active", "New", "Inactive"];
            const assignedStatus = statusList[idx % 3];

            return {
              id: p.id,
              patient_id_display: `PT-2026-${String(idx + 1).padStart(3, "0")}`,
              full_name: p.full_name || "Unknown Patient",
              gender: genderLabel,
              age: computedAge,
              last_visit: p.created_at
                ? new Date(p.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
                : "Sep 2, 2026",
              raw_created_at: p.created_at || new Date().toISOString(),
              allergies: p.allergies || null,
              status: assignedStatus,
            };
          });
          setPatients(formatted);
        }
      } catch (err) {
        console.error("Error loading patients:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPatients();
  }, []);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "all" ||
    genderFilter !== "all" ||
    ageFilter !== "all" ||
    dateRegisteredFilter !== "all" ||
    allergiesFilter !== "all" ||
    sortBy !== "newest";

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setGenderFilter("all");
    setAgeFilter("all");
    setDateRegisteredFilter("all");
    setAllergiesFilter("all");
    setSortBy("newest");
    setCurrentPage(1);
  };

  // Filtered and Sorted Patients List
  const filteredPatients = useMemo(() => {
    const list = patients.filter((patient) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        patient.full_name.toLowerCase().includes(q) ||
        patient.patient_id_display.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" || patient.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesGender =
        genderFilter === "all" || patient.gender.toLowerCase() === genderFilter.toLowerCase();

      let matchesAge = true;
      const numAge = Number(patient.age);
      if (ageFilter === "under30") matchesAge = numAge < 30;
      else if (ageFilter === "30to50") matchesAge = numAge >= 30 && numAge <= 50;
      else if (ageFilter === "over50") matchesAge = numAge > 50;

      let matchesDate = true;
      if (dateRegisteredFilter !== "all") {
        const createdMs = new Date(patient.raw_created_at).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (dateRegisteredFilter === "today") matchesDate = now - createdMs <= oneDay;
        else if (dateRegisteredFilter === "7days") matchesDate = now - createdMs <= 7 * oneDay;
        else if (dateRegisteredFilter === "30days") matchesDate = now - createdMs <= 30 * oneDay;
      }

      let matchesAllergies = true;
      if (allergiesFilter === "has_allergies") {
        matchesAllergies = Boolean(patient.allergies && patient.allergies.trim().length > 0);
      } else if (allergiesFilter === "no_allergies") {
        matchesAllergies = !patient.allergies || patient.allergies.trim().length === 0;
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesGender &&
        matchesAge &&
        matchesDate &&
        matchesAllergies
      );
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "name_asc") return a.full_name.localeCompare(b.full_name);
      if (sortBy === "age_desc") return Number(b.age) - Number(a.age);
      if (sortBy === "oldest")
        return new Date(a.raw_created_at).getTime() - new Date(b.raw_created_at).getTime();
      return new Date(b.raw_created_at).getTime() - new Date(a.raw_created_at).getTime();
    });

    return list;
  }, [
    patients,
    searchQuery,
    statusFilter,
    genderFilter,
    ageFilter,
    dateRegisteredFilter,
    allergiesFilter,
    sortBy,
  ]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    statusFilter,
    genderFilter,
    ageFilter,
    dateRegisteredFilter,
    allergiesFilter,
    sortBy,
  ]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const visiblePatients = filteredPatients.slice(startIndex, endIndex);

  const getStatusBadge = (status: PatientItem["status"]) => {
    switch (status) {
      case "Active":
        return "bg-secondary-container/20 text-secondary border border-secondary-container/50";
      case "New":
        return "bg-primary-container/20 text-primary border border-primary-container/50";
      case "Inactive":
        return "bg-surface-container-high text-on-surface-variant border border-outline-variant";
      default:
        return "bg-surface-container text-on-surface";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="max-w-container-max mx-auto space-y-lg font-body-md text-body-md text-on-background pb-xxl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-on-surface">
            Patients
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
            Manage your clinic&apos;s patient records.
          </p>
        </div>
        <Button asChild className="bg-primary text-on-primary hover:bg-primary/90 font-label-md">
          <Link href="/patients/new" className="flex items-center gap-xs">
            <Plus className="w-4 h-4" /> Add New Patient
          </Link>
        </Button>
      </div>

      {/* Search & Filter Toolbar Container */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm space-y-md">
        {/* Row 1: Primary Controls */}
        <div className="flex flex-col md:flex-row gap-md items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patients by name or ID..."
              className="w-full h-10 pl-10 pr-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary outline-none transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-sm w-full md:w-auto">
            <div className="flex items-center gap-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none cursor-pointer"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="new">New</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex items-center gap-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Gender:</span>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="h-9 px-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none cursor-pointer"
              >
                <option value="all">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex items-center gap-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant">Age:</span>
              <select
                value={ageFilter}
                onChange={(e) => setAgeFilter(e.target.value)}
                className="h-9 px-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none cursor-pointer"
              >
                <option value="all">All Ages</option>
                <option value="under30">Under 30</option>
                <option value="30to50">30 - 50</option>
                <option value="over50">Over 50</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowMoreFilters((prev) => !prev)}
              className={`h-9 px-3 flex items-center gap-xs rounded-lg border font-label-sm text-label-sm font-medium transition-colors ${showMoreFilters
                  ? "bg-primary-container text-on-primary-container border-primary"
                  : "bg-surface-container-low border-outline-variant hover:bg-surface-container text-on-surface"
                }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              More Filters
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-9 px-2.5 flex items-center gap-1 rounded-lg border border-outline-variant text-on-surface-variant hover:text-error hover:border-error text-label-sm transition-colors"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Collapsible More Filters Panel */}
        {showMoreFilters && (
          <div className="pt-md border-t border-outline-variant/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-md bg-surface-container-low/40 p-md rounded-lg">
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">
                Registration Period
              </label>
              <select
                value={dateRegisteredFilter}
                onChange={(e) => setDateRegisteredFilter(e.target.value)}
                className="w-full h-9 px-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="today">Registered Today</option>
                <option value="7days">Past 7 Days</option>
                <option value="30days">Past 30 Days</option>
              </select>
            </div>

            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">
                Allergy Profile
              </label>
              <select
                value={allergiesFilter}
                onChange={(e) => setAllergiesFilter(e.target.value)}
                className="w-full h-9 px-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none cursor-pointer"
              >
                <option value="all">All Patients</option>
                <option value="has_allergies">Has Documented Allergies</option>
                <option value="no_allergies">No Known Allergies</option>
              </select>
            </div>

            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-xs">
                Sort Records
              </label>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="w-full h-9 px-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface outline-none cursor-pointer"
              >
                <option value="newest">Registration: Newest First</option>
                <option value="oldest">Registration: Oldest First</option>
                <option value="name_asc">Patient Name: A to Z</option>
                <option value="age_desc">Age: Oldest to Youngest</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full h-9 px-3 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-on-surface text-label-sm font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Clear Advanced Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Patient Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-body-sm text-body-sm">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant text-on-surface-variant font-label-sm text-label-sm">
                <th className="py-sm px-md font-semibold whitespace-nowrap">Patient ID</th>
                <th className="py-sm px-md font-semibold whitespace-nowrap">Patient Name</th>
                <th className="py-sm px-md font-semibold whitespace-nowrap">Gender</th>
                <th className="py-sm px-md font-semibold whitespace-nowrap">Age</th>
                <th className="py-sm px-md font-semibold whitespace-nowrap">Last Visit</th>
                <th className="py-sm px-md font-semibold whitespace-nowrap">Status</th>
                <th className="py-sm px-md font-semibold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-on-surface-variant">
                    Loading patient records...
                  </td>
                </tr>
              ) : visiblePatients.length > 0 ? (
                visiblePatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-md px-md text-on-surface font-mono font-medium">
                      {patient.patient_id_display}
                    </td>
                    <td className="py-md px-md text-on-surface font-medium">
                      <Link
                        href={`/patients/${patient.id}`}
                        className="flex items-center gap-sm hover:text-primary transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-xs shrink-0">
                          {getInitials(patient.full_name)}
                        </div>
                        <span>{patient.full_name}</span>
                      </Link>
                    </td>
                    <td className="py-md px-md text-on-surface-variant">{patient.gender}</td>
                    <td className="py-md px-md text-on-surface-variant">{patient.age}</td>
                    <td className="py-md px-md text-on-surface-variant">{patient.last_visit}</td>
                    <td className="py-md px-md">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-[12px] font-medium ${getStatusBadge(
                          patient.status
                        )}`}
                      >
                        {patient.status}
                      </span>
                    </td>
                    <td className="py-md px-md text-right">
                      <Link
                        href={`/patients/${patient.id}`}
                        className="p-1 inline-flex text-on-surface-variant hover:text-on-surface rounded hover:bg-surface-container-high transition-colors"
                        title="View Patient Record"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-on-surface-variant">
                    No patients matched the criteria.
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
              {filteredPatients.length === 0 ? 0 : startIndex + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-on-surface">
              {Math.min(endIndex, filteredPatients.length)}
            </span>{" "}
            of <span className="font-medium text-on-surface">{filteredPatients.length}</span> entries
          </span>

          <div className="flex items-center gap-xs">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-outline-variant rounded bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`min-w-[32px] h-8 px-2 rounded font-label-sm text-label-sm font-semibold transition-colors ${currentPage === pageNum
                    ? "bg-primary text-on-primary shadow-xs"
                    : "border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low"
                  }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-outline-variant rounded bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
