"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { submitTicketSchema, updateTicketStatusSchema } from "@/lib/validators";
import { getUserFacingMessage } from "@/lib/errors";

// ── Types ──────────────────────────────────────────────────────────────────

export type SubmitTicketState = {
  success: boolean;
  error: string | null;
  ticketRef: string | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Generate a human-readable ticket ref like "TKT-A8F2C1". */
function generateTicketRef(): string {
  const hex = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `TKT-${hex}`;
}

// ── Submit a new support ticket ─────────────────────────────────────────────

export async function submitTicketAction(
  _prevState: SubmitTicketState,
  formData: FormData
): Promise<SubmitTicketState> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be logged in to submit a ticket.",
      ticketRef: null,
    };
  }

  const parsed = submitTicketSchema.safeParse({
    category: formData.get("category"),
    severity: formData.get("severity"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      ticketRef: null,
    };
  }

  const ticketRef = generateTicketRef();

  const { error } = await supabase.from("support_tickets").insert({
    user_id: user.id,
    user_email: user.email ?? "unknown",
    ticket_ref: ticketRef,
    category: parsed.data.category,
    severity: parsed.data.severity,
    description: parsed.data.description,
  });

  if (error) {
    return {
      success: false,
      error: getUserFacingMessage(error),
      ticketRef: null,
    };
  }

  return { success: true, error: null, ticketRef };
}

// ── Fetch all tickets (admin-only) ─────────────────────────────────────────

export async function fetchTicketsAction() {
  const supabase = createClient();

  const { data: tickets, error } = await supabase
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(getUserFacingMessage(error));
  }

  return tickets ?? [];
}

// ── Update ticket status (admin-only) ──────────────────────────────────────

export async function updateTicketStatusAction(
  ticketId: string,
  status: "open" | "in_progress" | "resolved" | "closed"
) {
  const supabase = createClient();

  const parsed = updateTicketStatusSchema.safeParse({ ticketId, status });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { error } = await supabase
    .from("support_tickets")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.ticketId);

  if (error) {
    return { error: getUserFacingMessage(error) };
  }

  revalidatePath("/settings/tickets");
  return { error: null };
}
