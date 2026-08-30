"use client";

import React, { useState } from "react";
import { ShieldCheck, UserCheck, Stethoscope } from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "doctor" | "front_desk";
  status: "active" | "inactive";
}

const initialStaff: StaffMember[] = [
  { id: "1", name: "Dr. Sarah Jenkins", email: "s.jenkins@medflow.clinic", role: "doctor", status: "active" },
  { id: "2", name: "Admin Lead John", email: "admin@medflow.clinic", role: "admin", status: "active" },
  { id: "3", name: "Receptionist Mary", email: "frontdesk@medflow.clinic", role: "front_desk", status: "active" },
];

export function StaffSettingsTable() {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);

  const handleRoleChange = (id: string, newRole: "admin" | "doctor" | "front_desk") => {
    setStaff((prev) =>
      prev.map((member) => (member.id === id ? { ...member, role: newRole } : member))
    );
  };

  const getRoleIcon = (role: StaffMember["role"]) => {
    switch (role) {
      case "doctor":
        return <Stethoscope className="w-4 h-4 text-primary" />;
      case "admin":
        return <ShieldCheck className="w-4 h-4 text-secondary" />;
      case "front_desk":
        return <UserCheck className="w-4 h-4 text-outline" />;
    }
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
            <th className="p-3.5">Email Address</th>
            <th className="p-3.5">Console Role Role</th>
            <th className="p-3.5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/60">
          {staff.map((member) => (
            <tr key={member.id} className="hover:bg-surface-container-low/50 transition">
              <td className="p-3.5 font-semibold text-on-surface">{member.name}</td>
              <td className="p-3.5 text-on-surface-variant">{member.email}</td>
              <td className="p-3.5 flex items-center gap-2">
                {getRoleIcon(member.role)}
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value as any)}
                  className="bg-surface-container border border-outline-variant rounded px-2.5 py-1 text-xs focus:outline-none focus:border-primary text-on-surface"
                >
                  <option value="admin">Admin</option>
                  <option value="doctor">Doctor</option>
                  <option value="front_desk">Front Desk</option>
                </select>
              </td>
              <td className="p-3.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-secondary-fixed text-on-secondary-fixed-variant">
                  {member.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
