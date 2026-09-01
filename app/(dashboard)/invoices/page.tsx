"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type InvoiceStatus = "Paid" | "Pending" | "Overdue" | "Draft";
type DatabaseStatus = "draft" | "sent" | "paid" | "overdue" | "void";
type DateRange = "30" | "90" | "year" | "custom";

interface InvoiceItem {
  id: string;
  invoice_number: string;
  date: string;
  created_at: string;
  patient_name: string;
  services: string;
  amount: string;
  total: number;
  status: InvoiceStatus;
}

const PAGE_SIZE = 10;
const INITIAL_INVOICES: InvoiceItem[] = [
  { id: "stitch-1", invoice_number: "INV-2023-0892", date: "Oct 24, 2023", created_at: "2023-10-24T12:00:00.000Z", patient_name: "Sarah Jenkins", services: "Cardiology Consultation + ECG", amount: "$245.00", total: 245, status: "Paid" },
  { id: "stitch-2", invoice_number: "INV-2023-0885", date: "Oct 22, 2023", created_at: "2023-10-22T12:00:00.000Z", patient_name: "Marcus Vance", services: "Lab Work (Blood Panel)", amount: "$112.50", total: 112.5, status: "Pending" },
  { id: "stitch-3", invoice_number: "INV-2023-0870", date: "Oct 15, 2023", created_at: "2023-10-15T12:00:00.000Z", patient_name: "David Chen", services: "Follow-up Visit", amount: "$75.00", total: 75, status: "Overdue" },
  { id: "stitch-4", invoice_number: "INV-2023-0864", date: "Oct 10, 2023", created_at: "2023-10-10T12:00:00.000Z", patient_name: "naveen", services: "General Health Screening", amount: "$180.00", total: 180, status: "Paid" },
];

const statusClasses: Record<InvoiceStatus, string> = {
  Paid: "bg-secondary-container/20 text-secondary border border-secondary-container/50",
  Pending: "bg-tertiary-container/20 text-tertiary-container border border-tertiary-container/50",
  Overdue: "bg-error-container/40 text-on-error-container border border-error-container",
  Draft: "bg-surface-container-high text-on-surface-variant border border-outline-variant",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function displayStatus(status: DatabaseStatus): InvoiceStatus {
  if (status === "paid") return "Paid";
  if (status === "overdue") return "Overdue";
  if (status === "draft" || status === "void") return "Draft";
  return "Pending";
}

function Icon({ children, className = "" }: { children: string; className?: string }) {
  return <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>{children}</span>;
}

function downloadCsv(rows: InvoiceItem[]) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const content = [["Invoice #", "Date Issued", "Patient Name", "Services", "Total Amount", "Status"], ...rows.map((row) => [row.invoice_number, row.date, row.patient_name, row.services, row.amount, row.status])].map((row) => row.map(escape).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "invoices.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function InvoicesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [invoices, setInvoices] = useState<InvoiceItem[]>(INITIAL_INVOICES);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | InvoiceStatus>("all");
  const [dateRange, setDateRange] = useState<DateRange>("30");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState("");
  const [newServices, setNewServices] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newStatus, setNewStatus] = useState<InvoiceStatus>("Pending");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadInvoices() {
      try {
        const [{ data: patients }, { data, error }] = await Promise.all([
          supabase.from("patients").select("id, full_name"),
          supabase.from("invoices").select("id, invoice_number, status, total, created_at, patient_id").order("created_at", { ascending: false }).limit(500),
        ]);
        if (!active || error || !data?.length) return;
        const patientNames = new Map((patients ?? []).map((patient) => [patient.id, patient.full_name]));
        setInvoices(data.map((invoice) => ({
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          date: formatDate(invoice.created_at),
          created_at: invoice.created_at,
          patient_name: patientNames.get(invoice.patient_id) ?? "Patient Record",
          services: "Consultation & Clinical Services",
          amount: `$${Number(invoice.total).toFixed(2)}`,
          total: Number(invoice.total),
          status: displayStatus(invoice.status),
        })));
      } catch (error) {
        console.error("Unable to load invoices:", error);
      }
    }
    void loadInvoices();
    return () => { active = false; };
  }, [supabase]);

  const filteredInvoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesSearch = !query || invoice.invoice_number.toLowerCase().includes(query) || invoice.patient_name.toLowerCase().includes(query) || invoice.services.toLowerCase().includes(query);
      return matchesSearch && (statusFilter === "all" || invoice.status === statusFilter);
    });
  }, [invoices, searchQuery, statusFilter, dateRange]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, dateRange]);
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedInvoices = filteredInvoices.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const closeModal = () => {
    setIsCreateModalOpen(false); setCreateError(null); setNewPatient(""); setNewServices(""); setNewAmount(""); setNewStatus("Pending");
  };

  const handleCreateInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    const patientName = newPatient.trim();
    if (!patientName) return;
    const total = Number(newAmount) || 150;
    const createdAt = new Date().toISOString();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const localInvoice: InvoiceItem = { id: `local-${Date.now()}`, invoice_number: invoiceNumber, date: formatDate(createdAt), created_at: createdAt, patient_name: patientName, services: newServices.trim() || "Consultation & Clinical Services", amount: `$${total.toFixed(2)}`, total, status: newStatus };

    setIsSubmitting(true); setCreateError(null);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const [{ data: profile }, { data: patient }] = await Promise.all([
          supabase.from("profiles").select("clinic_id").eq("id", authData.user.id).maybeSingle(),
          supabase.from("patients").select("id").ilike("full_name", patientName).limit(1).maybeSingle(),
        ]);
        if (profile?.clinic_id && patient?.id) {
          const status: DatabaseStatus = newStatus === "Paid" ? "paid" : newStatus === "Overdue" ? "overdue" : newStatus === "Draft" ? "draft" : "sent";
          const { data: inserted, error } = await supabase.from("invoices").insert({ clinic_id: profile.clinic_id, patient_id: patient.id, invoice_number: invoiceNumber, status, subtotal: total, tax: 0, total, currency: "USD" }).select("id").single();
          if (error) throw error;
          localInvoice.id = inserted.id;
        }
      }
      setInvoices((current) => [localInvoice, ...current]);
      closeModal();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Unable to persist this invoice.");
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="max-w-container-max mx-auto space-y-lg font-body-md text-body-md text-on-background pb-xxl">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
        <div><h1 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-on-surface">Invoices</h1><p className="font-body-md text-body-md text-on-surface-variant mt-xs">Manage patient billing, insurance claims, and payment status.</p></div>
        <div className="flex items-center gap-sm"><button onClick={() => downloadCsv(filteredInvoices)} className="flex items-center gap-xs px-md py-sm bg-surface-container-lowest border border-outline-variant rounded-lg font-label-md text-label-md text-on-surface hover:bg-surface-container-low transition-colors"><Icon className="text-[18px]">download</Icon>Export CSV</button><button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-xs px-md py-sm bg-primary-container text-on-primary rounded-lg font-label-md text-label-md hover:brightness-95 transition-all shadow-sm"><Icon className="text-[18px]">add</Icon>Create Invoice</button></div>
      </header>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col md:flex-row gap-md items-center justify-between shadow-sm">
        <div className="relative w-full md:w-96 focus-within:ring-2 focus-within:ring-primary rounded-lg"><Icon className="absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</Icon><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by invoice # or patient name..." className="w-full h-10 pl-[36px] pr-sm bg-surface-container-low border-none rounded-lg font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:bg-surface-container-lowest focus:ring-0 outline-none" /></div>
        <div className="flex flex-wrap items-center gap-sm w-full md:w-auto">
          <div className="relative"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | InvoiceStatus)} className="appearance-none h-10 pl-md pr-[32px] bg-surface-container-low border border-transparent rounded-lg font-label-sm text-label-sm text-on-surface focus:bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer outline-none"><option value="all">All Statuses</option><option value="Paid">Paid</option><option value="Pending">Pending</option><option value="Overdue">Overdue</option><option value="Draft">Draft</option></select><Icon className="absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">arrow_drop_down</Icon></div>
          <div className="relative"><select value={dateRange} onChange={(event) => setDateRange(event.target.value as DateRange)} className="appearance-none h-10 pl-md pr-[32px] bg-surface-container-low border border-transparent rounded-lg font-label-sm text-label-sm text-on-surface focus:bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer outline-none"><option value="30">Last 30 Days</option><option value="90">Last 90 Days</option><option value="year">This Year</option><option value="custom">Custom Range</option></select><Icon className="absolute right-sm top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">calendar_today</Icon></div>
          <button onClick={() => { setSearchQuery(""); setStatusFilter("all"); setDateRange("30"); }} className="p-sm text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors border border-transparent hover:border-outline-variant" title="Reset filters" aria-label="Reset filters"><Icon>tune</Icon></button>
        </div>
      </section>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left border-collapse"><thead><tr className="bg-surface-container-low border-b border-outline-variant"><th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant">Invoice #</th><th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant">Date Issued</th><th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant">Patient Name</th><th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant min-w-[200px]">Services</th><th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant text-right">Total Amount</th><th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant">Status</th><th className="py-sm px-md font-label-sm text-label-sm text-on-surface-variant text-right">Actions</th></tr></thead><tbody className="divide-y divide-outline-variant font-body-sm text-body-sm">{pagedInvoices.length ? pagedInvoices.map((invoice) => <tr key={invoice.id} className="hover:bg-surface-container-low transition-colors duration-150 group"><td className="py-md px-md font-medium text-on-surface"><Link href={`/invoices/${invoice.id}`} className="hover:text-primary hover:underline">{invoice.invoice_number}</Link></td><td className="py-md px-md text-on-surface-variant">{invoice.date}</td><td className="py-md px-md text-on-surface">{invoice.patient_name}</td><td className="py-md px-md text-on-surface-variant truncate max-w-[250px]" title={invoice.services}>{invoice.services}</td><td className="py-md px-md text-on-surface text-right font-medium">{invoice.amount}</td><td className="py-md px-md"><span className={`inline-flex items-center px-[8px] py-[2px] rounded-full text-[12px] font-medium ${statusClasses[invoice.status]}`}>{invoice.status}</span></td><td className="py-md px-md text-right"><div className="flex items-center justify-end gap-xs opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"><Link href={`/invoices/${invoice.id}`} className="p-xs text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded" title="View Details" aria-label={`View ${invoice.invoice_number}`}><Icon className="text-[20px]">visibility</Icon></Link><button onClick={() => window.print()} className="p-xs text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded" title="Download PDF" aria-label={`Download ${invoice.invoice_number} PDF`}><Icon className="text-[20px]">picture_as_pdf</Icon></button><button className="p-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded" title="More actions" aria-label={`More actions for ${invoice.invoice_number}`}><Icon className="text-[20px]">more_vert</Icon></button></div></td></tr>) : <tr><td colSpan={7} className="py-12 text-center text-on-surface-variant">No invoices matched your filters.</td></tr>}</tbody></table></div>
        <footer className="px-md py-sm border-t border-outline-variant bg-surface-container-lowest flex items-center justify-between gap-sm"><span className="font-body-sm text-body-sm text-on-surface-variant">Showing <span className="font-medium text-on-surface">{filteredInvoices.length ? (safePage - 1) * PAGE_SIZE + 1 : 0}</span> to <span className="font-medium text-on-surface">{Math.min(safePage * PAGE_SIZE, filteredInvoices.length)}</span> of <span className="font-medium text-on-surface">{filteredInvoices.length}</span> invoices</span><div className="flex items-center gap-xs"><button onClick={() => setCurrentPage(safePage - 1)} disabled={safePage === 1} className="p-xs border border-outline-variant rounded bg-surface-container-lowest text-on-surface-variant disabled:opacity-50" aria-label="Previous page"><Icon className="text-[20px]">chevron_left</Icon></button>{[1, 2, 3].map((page) => <button key={page} onClick={() => setCurrentPage(Math.min(page, totalPages))} className={`px-sm py-xs border rounded font-label-sm text-label-sm ${page === safePage ? "border-primary bg-primary-container text-on-primary" : "border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low"}`}>{page}</button>)}<span className="text-on-surface-variant px-xs">...</span><button onClick={() => setCurrentPage(totalPages)} className="px-sm py-xs border border-outline-variant bg-surface-container-lowest text-on-surface rounded font-label-sm text-label-sm hover:bg-surface-container-low">25</button><button onClick={() => setCurrentPage(safePage + 1)} disabled={safePage === totalPages} className="p-xs border border-outline-variant rounded bg-surface-container-lowest text-on-surface-variant disabled:opacity-50" aria-label="Next page"><Icon className="text-[20px]">chevron_right</Icon></button></div></footer>
      </section>

      {isCreateModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/20 backdrop-blur-sm p-md" role="dialog" aria-modal="true" aria-labelledby="create-invoice-title"><div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg w-full max-w-lg p-lg space-y-md"><div className="flex justify-between items-center border-b border-outline-variant pb-sm"><h2 id="create-invoice-title" className="font-headline-sm text-headline-sm text-on-surface">Create New Invoice</h2><button onClick={closeModal} className="text-on-surface-variant hover:text-on-surface" aria-label="Close"><Icon className="text-[20px]">close</Icon></button></div>{createError && <div className="rounded-lg bg-error-container text-on-error-container text-body-sm px-3 py-2">{createError}</div>}<form onSubmit={handleCreateInvoice} className="space-y-md font-body-sm"><label className="block font-label-md text-label-md text-on-surface">Patient Name<input required value={newPatient} onChange={(event) => setNewPatient(event.target.value)} placeholder="e.g. naveen or Sarah Jenkins" className="mt-xs w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-on-surface focus:border-primary outline-none" /></label><label className="block font-label-md text-label-md text-on-surface">Services<input value={newServices} onChange={(event) => setNewServices(event.target.value)} placeholder="e.g. Consultation + ECG" className="mt-xs w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-on-surface focus:border-primary outline-none" /></label><div className="grid grid-cols-2 gap-md"><label className="block font-label-md text-label-md text-on-surface">Amount<input type="number" min="0" step="0.01" value={newAmount} onChange={(event) => setNewAmount(event.target.value)} placeholder="245.00" className="mt-xs w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-on-surface focus:border-primary outline-none" /></label><label className="block font-label-md text-label-md text-on-surface">Status<select value={newStatus} onChange={(event) => setNewStatus(event.target.value as InvoiceStatus)} className="mt-xs w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-on-surface focus:border-primary outline-none"><option>Paid</option><option>Pending</option><option>Overdue</option><option>Draft</option></select></label></div><div className="flex justify-end gap-sm pt-sm border-t border-outline-variant"><button type="button" onClick={closeModal} className="px-md py-sm rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container-low">Cancel</button><button type="submit" disabled={isSubmitting} className="px-md py-sm rounded-lg bg-primary-container text-on-primary font-label-md text-label-md hover:brightness-95 disabled:opacity-50">{isSubmitting ? "Generating..." : "Generate Invoice"}</button></div></form></div></div>}
    </div>
  );
}
