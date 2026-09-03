import { type SupabaseClient } from "@supabase/supabase-js";
import { formatDistanceToNow } from "date-fns";
import { toDatabaseError } from "@/lib/errors";

/**
 * Shape of a notification row from the live `public.notifications` table.
 *
 * The app stores one row per recipient (`profile_id`) so every staff member
 * tracks their own read/unread state independently — no shared-row
 * "mark all read" concurrency bugs across a clinic.
 */
export interface RealNotification {
  id: string;
  profile_id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  link_url?: string | null;
  created_at: string;
  /** Human-friendly relative timestamp, added client-side. */
  timeAgo?: string;
}

/**
 * Fetch the most recent notifications for the currently authenticated user.
 * RLS on the `notifications` table scopes this to `profile_id = auth.uid()`.
 */
export async function fetchLiveNotifications(
  supabase: SupabaseClient,
  limit = 15
): Promise<RealNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw toDatabaseError(error, "Failed to load notifications.")!;
  }
  if (!data) return [];

  return data.map((n) => ({
    ...n,
    timeAgo: formatDistanceToNow(new Date(n.created_at), { addSuffix: true }),
  }));
}

/** Mark a single notification as read for the current user. */
export async function markSingleNotificationRead(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) {
    throw toDatabaseError(error, "Failed to mark notification as read.")!;
  }
}

/** Mark every unread notification of the current user as read. */
export async function markAllClinicNotificationsRead(
  supabase: SupabaseClient
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false);

  if (error) {
    throw toDatabaseError(error, "Failed to update notifications.")!;
  }
}
