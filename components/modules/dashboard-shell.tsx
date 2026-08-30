"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MedFlowLogo } from "@/components/ui/medflow-logo";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Calendar,
  CreditCard,
  BarChart3,
  Settings,
  Search,
  Bell,
  HelpCircle,
  Plus,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Doctors", href: "/doctors", icon: Stethoscope },
  { label: "Appointments", href: "/appointments", icon: Calendar },
  { label: "Billing", href: "/invoices", icon: CreditCard },
  { label: "Analytics", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function DashboardShell({
  userName = "Dr. Sarah Jenkins",
  userRole = "admin",
  avatarUrl,
  children,
}: {
  userName?: string;
  userRole?: string;
  avatarUrl?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Left Sidebar */}
      <aside className="w-60 border-r border-slate-200 bg-white flex flex-col justify-between p-4 shrink-0">
        <div>
          <div className="px-2 py-2 mb-6">
            <MedFlowLogo size="md" showSubtitle subtitle="Admin Console" />
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition ${isActive
                      ? "bg-blue-50 text-[#2563eb] border-r-4 border-[#2563eb] rounded-r-none"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#2563eb]" : "text-slate-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Action Buttons */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <Button asChild className="w-full bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg shadow-sm">
            <Link href="/appointments?book=true" className="flex items-center justify-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Record
            </Link>
          </Button>

          <div className="space-y-1 text-xs font-medium text-slate-500">
            <Link href="/settings" className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-slate-50">
              <HelpCircle className="w-4 h-4 text-slate-400" /> Support
            </Link>
            <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-6">
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">MedFlow Admin</h1>
            <div className="relative w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search patients, doctors, records..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#2563eb]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
              <Bell className="w-4 h-4" />
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
              <HelpCircle className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-slate-400">|</span>
            <button className="text-xs font-medium text-slate-600 hover:text-slate-900">Support</button>
            <button className="px-3 py-1 text-xs font-semibold border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50">
              Upgrade
            </button>
            <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden ml-1 border border-slate-300">
              <img
                src={avatarUrl || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=100"}
                alt={userName}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}