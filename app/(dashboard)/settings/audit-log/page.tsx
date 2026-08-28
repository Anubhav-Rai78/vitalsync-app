import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime } from "@/lib/utils";

const ACTION_STYLES: Record<string, string> = {
  INSERT: "bg-secondary-container/30 text-secondary",
  UPDATE: "bg-primary-container/20 text-primary",
  DELETE: "bg-error-container text-on-error-container",
};

export default async function AuditLogPage() {
  const supabase = createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, created_at, actor_id, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-lg">
      <div>
        <h2 className="text-headline-lg text-on-surface">System Audit Log</h2>
        <p className="text-body-sm text-on-surface-variant mt-xs">
          Every write to a clinical record, automatically logged — who, what, and when.
        </p>
      </div>

      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Actor</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Action</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Entity</th>
                <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant text-body-sm text-on-surface">
              {(logs ?? []).map((log: any) => (
                <tr key={log.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="py-sm px-md">{log.profiles?.full_name ?? "System"}</td>
                  <td className="py-sm px-md">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-sm ${ACTION_STYLES[log.action] ?? ""}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-sm px-md text-on-surface-variant font-mono text-[13px]">
                    {log.entity_type} · {String(log.entity_id).slice(0, 8)}
                  </td>
                  <td className="py-sm px-md text-on-surface-variant">
                    {formatDate(log.created_at)} · {formatTime(log.created_at)}
                  </td>
                </tr>
              ))}
              {(!logs || logs.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-lg px-md text-center text-on-surface-variant">
                    No activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
