import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

// Client-side Supabase client — uses the anon key only.
// RLS policies are the actual security boundary, not this file.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
