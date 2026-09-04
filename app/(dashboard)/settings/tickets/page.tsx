"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TicketCheck,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { fetchTicketsAction, updateTicketStatusAction } from "../actions/ticket-actions";

type Ticket = {
  id: string;
  user_id: string;
  user_email: string;
  ticket_ref: string;
  category: string;
  severity: string;
  description: string;
  status: string;
  created_at: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  billing: "Billing",
  appointments: "Appointments",
  ehr: "EHR",
  bug: "Bug",
};

const SEVERITY_BADGE: Record<string, string> = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-indigo-50 text-indigo-700 border-indigo-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-gray-50 text-gray-600 border-gray-200",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TicketDeskPage() {
  const router = useRouter();
  const supabase = createClient();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"open" | "in_progress" | "resolved" | "all">("open");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function checkRoleAndLoad() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role?.toLowerCase() !== "admin") {
        router.push("/dashboard");
        return;
      }
      try {
        const items = await fetchTicketsAction();
        setTickets(items);
      } catch (err) {
        console.error("Failed to load tickets:", err);
      } finally {
        setLoading(false);
      }
    }
    checkRoleAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleStatusToggle = (ticket: Ticket) => {
    const nextStatus =
      ticket.status === "open" || ticket.status === "in_progress"
        ? "resolved"
        : "open";

    startTransition(async () => {
      const { error } = await updateTicketStatusAction(ticket.id, nextStatus as "open" | "resolved");
      if (error) {
        toast.error(error);
        return;
      }
      setTickets((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, status: nextStatus } : t))
      );
      toast.success(`Ticket ${ticket.ticket_ref} marked ${nextStatus}.`);
    });
  };

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);
  const openCount = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-body-sm text-on-surface-variant font-sans">
        Loading support tickets...
      </div>
    );
  }

  return (
    <div className="max-w-container-max mx-auto space-y-xl font-body-md text-body-md text-on-background pb-xxl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
            <TicketCheck className="w-5 h-5 text-primary" />
            Support Ticket Desk
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-xs">
            Triage clinic support requests and manage incident resolution.
          </p>
        </div>
        <Button asChild variant="secondary" size="sm" className="font-label-sm flex items-center gap-1.5">
          <Link href="/settings">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings
          </Link>
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        <div className="bg-surface rounded-xl border border-outline-variant p-md flex items-center justify-between shadow-xs">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Total Tickets</p>
            <h3 className="font-headline-md text-headline-md text-on-surface mt-sm">{tickets.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary-container/20 text-primary flex items-center justify-center">
            <Inbox className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-md flex items-center justify-between shadow-xs">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Open / In Progress</p>
            <h3 className="font-headline-md text-headline-md text-on-surface mt-sm">{openCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-md flex items-center justify-between shadow-xs">
          <div>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Resolved</p>
            <h3 className="font-headline-md text-headline-md text-on-surface mt-sm">{resolvedCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>


      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["open", "in_progress", "resolved", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-md py-sm rounded-lg text-label-sm font-semibold transition ${filter === f
              ? "bg-primary text-on-primary"
              : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-lowest border border-outline-variant"
              }`}
          >
            {f === "all" ? "All" : f.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>


      {/* Ticket Table */}
      <div className="bg-surface rounded-xl border border-outline-variant shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-xl text-center text-on-surface-variant text-body-sm">
            <Inbox className="w-8 h-8 mx-auto mb-sm text-outline" />
            No {filter === "all" ? "" : filter + " "}tickets found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-label-sm text-label-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low/50">
                  <th className="px-md py-sm text-left font-semibold text-on-surface-variant">Ticket</th>
                  <th className="px-md py-sm text-left font-semibold text-on-surface-variant">User Email</th>
                  <th className="px-md py-sm text-left font-semibold text-on-surface-variant">Category</th>
                  <th className="px-md py-sm text-left font-semibold text-on-surface-variant">Severity</th>
                  <th className="px-md py-sm text-left font-semibold text-on-surface-variant">Description</th>
                  <th className="px-md py-sm text-left font-semibold text-on-surface-variant">Submitted</th>
                  <th className="px-md py-sm text-left font-semibold text-on-surface-variant">Status</th>
                  <th className="px-md py-sm text-left font-semibold text-on-surface-variant">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-outline-variant/40 hover:bg-surface-container-lowest/50 transition">
                    <td className="px-md py-sm font-mono font-bold text-primary">
                      {ticket.ticket_ref}
                    </td>
                    <td className="px-md py-sm text-on-surface-variant">{ticket.user_email}</td>
                    <td className="px-md py-sm text-on-surface">
                      {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                    </td>
                    <td className="px-md py-sm">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${SEVERITY_BADGE[ticket.severity] ?? ""}`}>
                        {ticket.severity}
                      </span>
                    </td>
                    <td className="px-md py-sm text-on-surface-variant max-w-[280px] truncate" title={ticket.description}>
                      {ticket.description}
                    </td>
                    <td className="px-md py-sm text-on-surface-variant whitespace-nowrap">
                      {formatDate(ticket.created_at)}
                    </td>
                    <td className="px-md py-sm">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_BADGE[ticket.status] ?? ""}`}>
                        {ticket.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-md py-sm">
                      <Button
                        size="sm"
                        variant={ticket.status === "resolved" ? "secondary" : "primary"}
                        onClick={() => handleStatusToggle(ticket)}
                        disabled={isPending}
                        className="text-[10px]"
                      >
                        {isPending
                          ? "Updating..."
                          : ticket.status === "resolved"
                            ? "Reopen"
                            : "Resolve"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* Footer */}
      <div className="pt-md flex justify-between items-center border-t border-outline-variant">
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          {openCount} open · {resolvedCount} resolved
        </span>
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          RLS-protected · Admin only
        </span>
      </div>
    </div>
  );
}

