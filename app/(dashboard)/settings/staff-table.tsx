"use client";

import React, { useTransition } from "react";
import { ShieldCheck, UserCheck, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { updateStaffRoleAction } from "./actions";
import type { UserRole } from "@/lib/supabase/types";

interface StaffSettingsTableProps {
  staff: {
    id: string;
    full_name: string;
    role: string;
    is_active: boolean;
  }[];
}

const ROLE_ICON: Record<string, React.ReactNode> = {
  doctor: <Stethoscope className="w-4 h-4 text-primary" />,
  admin: <ShieldCheck className="w-4 h-4 text-secondary" />,
  front_desk: <UserCheck className="w-4 h-4 text-outline" />,
};

export function StaffSettingsTable({ staff }: StaffSettingsTableProps) {
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (id: string, newRole: UserRole) => {
    startTransition(async () => {
      try {
        await updateStaffRoleAction(id, newRole);
        toast.success("Staff role updated.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update role.");
      }
    });
  };

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-level-2 mt-6">
      <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
        <div>
          <h3 className="font-display font-semibold text-on-surface">Practitioner & Staff Roles</h3>
          <p className="text-xs text-on-surface-variant">Update active personnel levels and console access</p>
        </div>
      </div>

      <table className="w-full text-left text-body-sm">
        <thead className="bg-surface-container border-b border-outline-variant text-xs text-on-surface-variant font-semibold">
          <tr>
            <th className="p-3.5">Full Name</th>
            <th className="p-3.5">Console Role</th>
            <th className="p-3.5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/60">
          {staff.map((member) => (
            <tr key={member.id} className="hover:bg-surface-container-low/50 transition">
              <td className="p-3.5 font-semibold text-on-surface">{member.full_name}</td>
              <td className="p-3.5 flex items-center gap-2">
                {ROLE_ICON[member.role] ?? <UserCheck className="w-4 h-4 text-outline" />}
                <select
                  value={member.role}
                  disabled={isPending}
                  onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                  className="bg-surface-container border border-outline-variant rounded px-2.5 py-1 text-xs focus:outline-none focus:border-primary text-on-surface disabled:opacity-50"
                >
                  <option value="admin">Admin</option>
                  <option value="doctor">Doctor</option>
                  <option value="front_desk">Front Desk</option>
                </select>
              </td>
              <td className="p-3.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-secondary-fixed text-on-secondary-fixed-variant">
                  {member.is_active ? "Active" : "Inactive"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
