"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Download,
  Filter,
  Eye,
  FileText,
  MoreVertical,
  ChevronDown,
  X,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "void";

interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  total: number;
  currency: string;
  due_date: string | null;
  created_at: string;
  patient_name: string | null;
  services_summary: string;
}

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: "bg-surface-variant text-on-surface-variant",
  sent: "bg-primary-container/20 text-primary",
  paid: "bg-secondary-container/40 text-secondary",
  overdue: "bg-error-container text-on-error-container",
  void: "bg-surface-variant text-on-surface-variant line-through",
};

const PAGE_SIZE = 10;
type DateRange = "all" | "30" | "90" | "year";

function exportInvoicesCsv(rows: InvoiceRow[]) {
  const headers = ["Invoice #", "Date Issued", "Patient Name", "Services", "Total", "Status"];
  const lines = rows.map((r) =>
    [
      r.invoice_number,
      r.created_at ? formatDate(r.created_at) : "",
      r.patient_name ?? "",
      "\"" + r.services_summary.replace(/"/g, '""') + "\"",
      formatCurrency(Number(r.total), r.currency),
      r.status,
    ].join(",")
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "medflow_invoices.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | InvoiceStatus>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: patientIds } = await supabase.from("patients").select("id, full_name");
      const nameById = new Map((patientIds ?? []).map((p) => [p.id, p.full_name]));
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, total, currency, due_date, created_at, patient_id")
        .order("created_at", { ascending: false })
        .limit(500);
      if (active) {
        if (!error) {
          setInvoices(
            (data ?? []).map((inv: any) => ({
              id: inv.id,
              invoice_number: inv.invoice_number,
              status: inv.status,
              total: inv.total,
              currency: inv.currency,
              due_date: inv.due_date,
              created_at: inv.created_at,
              patient_name: nameById.get(inv.patient_id) ?? null,
              services_summary: "Consultation & services",
            }))
          );
        }
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let inRange = invoices.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (!inv.created_at) return dateRange === "all";
      const created = new Date(inv.created_at);
      const now = new Date();
      if (dateRange === "30") return now.getTime() - created.getTime() <= 30 * 864e5;
      if (dateRange === "90") return now.getTime() - created.getTime() <= 90 * 864e5;
      if (dateRange === "year") return created.getFullYear() === now.getFullYear();
      return true;
    });
    if (q) {
      inRange = inRange.filter(
        (inv) =>
          inv.invoice_number.toLowerCase().includes(q) ||
          (inv.patient_name ?? "").toLowerCase().includes(q)
      );
    }
    return inRange;
  }, [invoices, searchQuery, statusFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateRange("all");
    setCurrentPage(1);
  };

  const handleCreate = async () => {
    setCreateError(null);
    try {
      const [{ data: profile }, { data: patient }] = await Promise.all([
        supabase.from("profiles").select("clinic_id").maybeSingle(),
        supabase.from("patients").select("id").limit(1).maybeSingle(),
      ]);
      if (!profile?.clinic_id || !patient?.id) {
        setCreateError("Add a patient before creating an invoice.");
        return;
      }
      const seq = String(invoices.length + 1).padStart(4, "0");
      const { error } = await supabase.from("invoices").insert({
        clinic_id: profile.clinic_id,
        patient_id: patient.id,
        invoice_number: `INV-2026-${seq}`,
        status: "draft",
        subtotal: 0,
        tax: 0,
        total: 0,
        currency: "INR",
      });
      if (error) {
        setCreateError(error.message);
        return;
      }
      setIsCreateOpen(false);
      window.location.reload();
    } catch (err: any) {
      setCreateError(err.message ?? "Failed to create invoice");
    }
  };


  return (
    <div className="space-y-lg">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-lg text-on-surface font-display">Invoices</h1>
          <p className="text-body-sm text-on-surface-variant mt-xs">
            Manage patient billing, insurance claims, and payment status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => exportInvoicesCsv(filtered)} className="flex items-center gap-1.5 text-xs font-semibold">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => { setCreateError(null); setIsCreateOpen(true); }} className="flex items-center gap-1.5 text-xs font-semibold">
            <Plus className="w-3.5 h-3.5" /> Create Invoice
          </Button>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full md:max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search by invoice # or patient name..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary-container outline-none transition"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
              className="h-10 pl-3 pr-8 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface focus:border-primary outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="sent">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="draft">Draft</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-outline absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => { setDateRange(e.target.value as DateRange); setCurrentPage(1); }}
              className="h-10 pl-3 pr-8 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface focus:border-primary outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="year">This Year</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-outline absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button onClick={resetFilters} className="h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-body-sm font-semibold text-on-surface hover:bg-surface-container-low transition flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-outline" /> Reset
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-level-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-semibold">Invoice #</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-semibold">Date Issued</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-semibold">Patient Name</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-semibold">Services</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-semibold text-right">Total</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-semibold">Status</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-body-sm text-on-surface">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="py-2 px-4">
                      <span className="skeleton block h-6 w-full rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-xl px-4 text-center text-on-surface-variant">
                    <Receipt className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    No invoices matched your filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface-container-low transition group">
                    <td className="py-sm px-md">
                      <Link href={`/invoices/${inv.id}`} className="font-mono text-[13px] hover:text-primary hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="py-sm px-md text-on-surface-variant">{inv.created_at ? formatDate(inv.created_at) : "—"}</td>
                    <td className="py-sm px-md font-semibold text-on-surface">{inv.patient_name ?? "—"}</td>
                    <td className="py-sm px-md text-on-surface-variant truncate max-w-[220px]" title={inv.services_summary}>{inv.services_summary}</td>
                    <td className="py-sm px-md text-right font-bold tabular-nums">{formatCurrency(Number(inv.total), inv.currency)}</td>
                    <td className="py-sm px-md">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-sm capitalize ${STATUS_STYLES[inv.status] ?? ""}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-sm px-md text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/invoices/${inv.id}`} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary-container/20 rounded-md transition-colors" title="View Details">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary-container/20 rounded-md transition-colors" title="Download PDF" onClick={() => window.print()}>
                          <FileText className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-md transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-outline-variant bg-surface-container-lowest flex flex-wrap items-center justify-between gap-2 text-body-sm text-on-surface-variant">
          <span>Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1} to {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} invoices</span>
          <div className="flex items-center gap-1">
            <button className="px-2 py-1 rounded border border-outline-variant hover:bg-surface-container-low disabled:opacity-40" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)} aria-label="Previous page">‹</button>
            {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
              const page = i + 1;
              return (
                <button key={page} onClick={() => setCurrentPage(page)} className={`w-7 h-7 rounded border text-xs ${page === safePage ? "bg-primary-container/20 text-primary font-semibold border-primary/40" : "hover:bg-surface-container-low border-outline-variant text-on-surface"}`}>
                  {page}
                </button>
              );
            })}
            {totalPages > 5 && <span className="px-1 text-on-surface-variant">…</span>}
            <button className="px-2 py-1 rounded border border-outline-variant hover:bg-surface-container-low disabled:opacity-40" disabled={safePage >= totalPages} onClick={() => setCurrentPage(safePage + 1)} aria-label="Next page">›</button>
          </div>
        </div>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-level-3 border border-outline-variant w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-outline-variant pb-3">
              <h3 className="text-headline-sm text-on-surface">Create New Invoice</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-on-surface-variant hover:text-on-surface"><X className="w-4 h-4" /></button>
            </div>
            {createError && (
              <div className="rounded-lg bg-error-container text-on-error-container text-body-sm px-3 py-2">{createError}</div>
            )}
            <p className="text-body-sm text-on-surface-variant">A draft invoice will be created. You can then add patients and line items from the invoice detail view.</p>
            <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant">
              <Button variant="secondary" size="sm" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate}>Generate Invoice</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
