"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { MedFlowLogo } from "@/components/ui/medflow-logo";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Patients", href: "/patients", icon: "person" },
  { label: "Doctors", href: "/doctors", icon: "medical_services" },
  { label: "Appointments", href: "/appointments", icon: "event" },
  { label: "Billing", href: "/invoices", icon: "payments" },
  { label: "Analytics", href: "/reports", icon: "monitoring" },
  { label: "Settings", href: "/settings", icon: "settings" },
];

export function DashboardShell({
  userName = "Dr. Sarah Jenkins",
  userRole = "admin",
  avatarUrl,
  children,
}: {
  userName?: string;
  userRole?: UserRole | string;
  avatarUrl?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen">
      {/* Side Navigation */}
      <aside className="h-screen w-64 fixed left-0 top-0 bg-surface dark:bg-surface-dim border-r border-outline-variant dark:border-outline z-50">
        <div className="flex flex-col h-full py-6">
          {/* Brand */}
          <div className="px-6 mb-8 flex items-center gap-3">
            <MedFlowLogo size="md" />
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-2 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors active:scale-95 duration-150 rounded-md font-label-md text-label-md",
                    active
                      ? "text-primary dark:text-primary-fixed bg-primary-container/10 dark:bg-primary-container/20 border-r-4 border-primary rounded-l-md font-semibold"
                      : "text-on-surface-variant hover:text-primary hover:bg-surface-container-high dark:hover:bg-surface-container-highest"
                  )}
                >
                  <span className={cn("material-symbols-outlined", !active && "outline-icon")}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* CTA */}
          <div className="px-4 mt-4">
            <Link
              href="/appointments/new"
              className="w-full py-2.5 px-4 bg-primary-container text-on-primary-container rounded-lg font-label-md text-label-md flex justify-center items-center gap-2 hover:opacity-90 transition-opacity active:scale-95 duration-150"
            >
              <span className="material-symbols-outlined outline-icon text-[18px]">add</span>
              New Record
            </Link>
          </div>

          {/* Footer Links */}
          <div className="px-2 mt-8 space-y-1">
            <Link
              href="/settings/system-health"
              className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-container-high dark:hover:bg-surface-container-highest transition-colors active:scale-95 duration-150 rounded-md font-label-md text-label-md"
            >
              <span className="material-symbols-outlined outline-icon">help</span>
              <span>Support</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-error hover:bg-error-container transition-colors active:scale-95 duration-150 rounded-md font-label-md text-label-md text-left"
            >
              <span className="material-symbols-outlined outline-icon">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Top Navigation */}
      <header className="fixed top-0 right-0 left-64 z-40 flex justify-between items-center px-lg bg-surface/80 dark:bg-surface-dim/80 backdrop-blur-md h-16 border-b border-outline-variant dark:border-outline">
        <div className="flex items-center gap-6">
          <h2 className="hidden md:block font-headline-sm text-headline-sm font-bold text-on-surface">MedFlow Clinic Admin</h2>
          <div className="relative w-64 md:w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              className="w-full h-10 pl-10 pr-4 bg-surface-container-low border border-outline-variant rounded-full text-body-sm font-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-on-surface-variant/70"
              placeholder="Search patients, doctors, records..."
              type="text"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 text-on-surface-variant hover:text-primary dark:hover:text-primary-fixed transition-colors active:opacity-80 rounded-full hover:bg-surface-container-high">
            <span className="material-symbols-outlined outline-icon">notifications</span>
          </button>
          <button className="p-2 text-on-surface-variant hover:text-primary dark:hover:text-primary-fixed transition-colors active:opacity-80 rounded-full hover:bg-surface-container-high">
            <span className="material-symbols-outlined outline-icon">help_center</span>
          </button>
          <div className="h-6 w-px bg-outline-variant mx-2" />
          <Link href="/settings/system-health" className="font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors">
            Support
          </Link>
          <Link
            href="/settings"
            className="font-label-md text-label-md px-4 py-1.5 border border-outline-variant rounded-md hover:bg-surface-container-high transition-colors text-on-surface"
          >
            Upgrade
          </Link>
          <Link href="/profile" className="ml-2">
            {avatarUrl ? (
              <img
                alt="User Avatar"
                className="w-8 h-8 rounded-full object-cover border border-outline-variant"
                src={avatarUrl}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-sm font-semibold border border-outline-variant">
                {userName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="ml-64 pt-16 min-h-screen bg-background">
        <div className="p-lg md:p-xl max-w-container-max mx-auto space-y-8">{children}</div>
      </main>
    </div>
  );
}