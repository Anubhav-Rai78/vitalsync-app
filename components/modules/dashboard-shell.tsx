"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  X,
  CheckCircle2,
  Zap,
  ExternalLink,
  MessageSquare,
  FileQuestion,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

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
  userName = "Admin",
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
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);

  const [notifications, setNotifications] = useState([
    { id: "1", title: "New Patient Registered", desc: "Patient record created successfully", time: "10 mins ago", unread: true },
    { id: "2", title: "Upcoming Appointment", desc: "Consultation scheduled for today", time: "25 mins ago", unread: true },
    { id: "3", title: "Clinical Notice", desc: "System audit log updated", time: "1 hour ago", unread: false },
  ]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();

        setCurrentUser({
          name: profile?.full_name || user.email?.split("@")[0] || "User",
          email: user.email || "",
          role: profile?.role || "Admin",
        });
      }
    }
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
        setIsProfileMenuOpen(false);
        setIsSupportOpen(false);
        setIsUpgradeOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setIsSigningOut(false);
    }
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const avatarInitials = (userName || "A")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-surface-container-low text-on-surface font-sans">
      {/* Left Sidebar */}
      <aside className="w-60 border-r border-outline-variant bg-surface-container-lowest flex flex-col justify-between p-4 shrink-0">
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
                    ? "bg-primary-container/20 text-primary border-r-4 border-primary rounded-r-none"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-outline"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Action Buttons */}
        <div className="space-y-3 pt-4 border-t border-outline-variant">
          <Button asChild className="w-full bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold py-2 rounded-lg shadow-sm">
            <Link href="/appointments?book=true" className="flex items-center justify-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Record
            </Link>
          </Button>

          <div className="space-y-1 text-xs font-medium text-on-surface-variant">
            <button
              onClick={() => setIsSupportOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-surface-container-low text-on-surface-variant text-left transition"
            >
              <HelpCircle className="w-4 h-4 text-outline" /> Support
            </button>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-on-surface-variant hover:bg-error-container/30 hover:text-error text-left transition"
            >
              <LogOut className="w-4 h-4" /> {isSigningOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-outline-variant bg-surface-container-lowest flex items-center justify-between px-8 shrink-0 relative z-20">
          <div className="flex items-center gap-6">
            <h1 className="text-sm font-bold text-on-surface tracking-tight">MedFlow Admin</h1>

            {/* Global Search */}
            <div className="relative w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-outline" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patients, doctors, records..."
                className="w-full pl-8 pr-4 py-1.5 text-xs bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary"
              />


              {isSearchOpen && searchQuery.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl p-3 z-50">
                  <div className="flex justify-between items-center pb-2 border-b border-outline-variant text-[11px] font-semibold text-outline">
                    <span>Quick Navigation</span>
                    <button
                      onClick={() => setIsSearchOpen(false)}
                      className="text-outline hover:text-on-surface-variant"
                      aria-label="Close search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-1 mt-2 max-h-60 overflow-y-auto">
                    <Link
                      href={`/patients?q=${encodeURIComponent(searchQuery)}`}
                      onClick={() => setIsSearchOpen(false)}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-container-low text-xs text-on-surface-variant"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-primary" /> Search Patients matching &ldquo;{searchQuery}&rdquo;
                    </Link>
                    <Link
                      href={`/appointments?q=${encodeURIComponent(searchQuery)}`}
                      onClick={() => setIsSearchOpen(false)}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-container-low text-xs text-on-surface-variant"
                    >
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Search Appointments matching &ldquo;{searchQuery}&rdquo;
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 text-outline hover:text-on-surface-variant rounded-lg hover:bg-surface-container-low relative transition"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl p-4 z-50">
                  <div className="flex justify-between items-center pb-2.5 border-b border-outline-variant">
                    <span className="text-xs font-bold text-on-surface">Notifications ({unreadCount})</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="py-2.5 text-xs space-y-0.5">
                        <div className="flex items-center justify-between font-semibold text-on-surface">
                          <span>{n.title}</span>
                          {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        </div>
                        <p className="text-on-surface-variant text-[11px]">{n.desc}</p>
                        <span className="text-[10px] text-outline block">{n.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsSupportOpen(true)}
              className="p-2 text-outline hover:text-on-surface-variant rounded-lg hover:bg-surface-container-low transition"
              aria-label="Help & Support"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <span className="text-xs font-medium text-outline">|</span>

            <button
              onClick={() => setIsSupportOpen(true)}
              className="text-xs font-medium text-on-surface-variant hover:text-on-surface transition"
            >
              Support
            </button>

            <button
              onClick={() => setIsUpgradeOpen(true)}
              className="px-3 py-1 text-xs font-semibold border border-outline-variant rounded-md text-on-surface-variant hover:bg-surface-container-low flex items-center gap-1 transition"
            >
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" /> Upgrade
            </button>

            {/* Profile Avatar Trigger + Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setIsProfileMenuOpen((open) => !open)}
                title={`${currentUser?.name || userName} — account menu`}
                className="w-7 h-7 rounded-full overflow-hidden ml-1 border border-outline flex items-center justify-center bg-primary text-on-primary text-[10px] font-bold hover:ring-2 hover:ring-primary/40 transition shrink-0"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={currentUser?.name || userName} className="w-full h-full object-cover" />
                ) : (
                  avatarInitials
                )}
              </button>

              {/* Account Details Dropdown */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl p-3 z-50">
                  <div className="flex items-center gap-3 pb-3 border-b border-outline-variant">
                    <div className="w-10 h-10 rounded-full bg-primary-container/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={currentUser?.name || userName} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        avatarInitials
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-bold text-xs text-on-surface truncate">{currentUser?.name || userName}</div>
                      <div className="text-[11px] text-on-surface-variant truncate">{currentUser?.email}</div>
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-slate-100 text-on-surface-variant text-[10px] rounded font-medium capitalize">
                        {currentUser?.role || userRole}
                      </span>
                    </div>
                  </div>

                  <div className="py-2 space-y-1 text-xs text-on-surface-variant border-b border-outline-variant">
                    <Link
                      href="/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-container-low font-medium"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-outline" /> Account Profile
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-container-low font-medium"
                    >
                      <Settings className="w-3.5 h-3.5 text-outline" /> Clinic Settings
                    </Link>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSignOut}
                      disabled={isSigningOut}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-error-container/30 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" /> {isSigningOut ? "Signing out..." : "Sign Out"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>


      {/* Support Modal */}
      {isSupportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-outline-variant bg-surface-container-low/50">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-on-surface text-sm">MedFlow Clinic Support</h3>
              </div>
              <button onClick={() => setIsSupportOpen(false)} className="text-outline hover:text-on-surface-variant" aria-label="Close support">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-primary-container/20/60 rounded-xl border border-primary-container/30 space-y-1">
                <div className="font-bold text-on-surface flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" /> 24/7 Clinical Support Desk
                </div>
                <p className="text-on-surface-variant">Email: support@medflow.clinic</p>
                <p className="text-on-surface-variant">Clinical Desk Toll-Free: +91 (800) 492-3829</p>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-on-surface-variant">Clinical Documentation</div>
                <div className="p-3 rounded-lg border border-outline-variant flex items-center justify-between text-on-surface-variant">
                  <span className="flex items-center gap-2 font-medium">
                    <FileQuestion className="w-4 h-4 text-outline" /> HIPAA Security & Audit Compliance Guide
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-outline" />
                </div>
              </div>
            </div>
            <div className="p-4 bg-surface-container-low border-t border-outline-variant text-right">
              <Button onClick={() => setIsSupportOpen(false)} size="sm" className="bg-primary text-on-primary">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {isUpgradeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-outline-variant bg-surface-container-low/50">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                <h3 className="font-bold text-on-surface text-sm">Upgrade MedFlow Clinic Plan</h3>
              </div>
              <button onClick={() => setIsUpgradeOpen(false)} className="text-outline hover:text-on-surface-variant" aria-label="Close upgrade">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 rounded-xl border-2 border-primary bg-primary-container/20/30 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-on-surface">MedFlow Enterprise</span>
                  <span className="font-bold text-base text-primary">₹4,999/mo</span>
                </div>
                <p className="text-on-surface-variant">Complete multi-doctor clinical operations with automated triage.</p>
                <div className="space-y-1.5 pt-2 text-on-surface-variant">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Unlimited Patients & Consultations
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Automated Appointment WhatsApp/SMS Alerts
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Full HIPAA Audit Trail & Analytics
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-surface-container-low border-t border-outline-variant flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsUpgradeOpen(false)} size="sm">
                Cancel
              </Button>
              <Button onClick={() => setIsUpgradeOpen(false)} size="sm" className="bg-primary text-on-primary">
                Proceed
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

