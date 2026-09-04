"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
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
  ExternalLink,
  MessageSquare,
  FileQuestion,
  User as UserIcon,
  ShieldCheck,
  AlertTriangle,
  Keyboard,
  BookOpen,
  Send,
  Phone,
  CircleCheck,
  TicketCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { submitTicketAction } from "@/app/(dashboard)/settings/actions/ticket-actions";
import { getSystemHealthAction } from "@/app/(dashboard)/settings/actions";
import {
  fetchLiveNotifications,
  markAllClinicNotificationsRead,
  markSingleNotificationRead,
  type RealNotification,
} from "@/lib/services";

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
  const helpMenuRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Ticket form state
  const [ticketCategory, setTicketCategory] = useState("general");
  const [ticketSeverity, setTicketSeverity] = useState("low");
  const [ticketDescription, setTicketDescription] = useState("");
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [urgentAlert, setUrgentAlert] = useState<string | null>(null);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);

  const [notifications, setNotifications] = useState<RealNotification[]>([]);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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

        // Probe for urgent critical alerts (admins only).
        if ((profile?.role || "").toLowerCase() === "admin") {
          try {
            const health = await getSystemHealthAction();
            if (health.hasCriticalAlert && health.alertMessage) {
              setUrgentAlert(health.alertMessage);
            }
          } catch (e) {
            console.error("Health probe error:", e);
          }
        }
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
        setIsHelpOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (helpMenuRef.current && !helpMenuRef.current.contains(e.target as Node)) {
        setIsHelpOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load initial notifications for the current user.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const items = await fetchLiveNotifications(supabase, 15);
        if (active) {
          setNotifications(items);
          setNotificationsLoaded(true);
        }
      } catch (e) {
        console.error("Failed to load notifications:", e);
        if (active) setNotificationsLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to realtime inserts/updates on the notifications table so new
  // events (patient registered, appointment booked, etc.) appear instantly
  // without a page refresh. RLS guarantees we only receive rows for our own
  // profile_id.
  useEffect(() => {
    const channel = supabase
      .channel("realtime-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const newItem = payload.new as RealNotification;
          setNotifications((prev) => [
            { ...newItem, timeAgo: "just now" },
            ...prev,
          ]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload) => {
          const updated = payload.new as RealNotification;
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === updated.id ? { ...n, is_read: updated.is_read } : n
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

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

  const markAllNotificationsAsRead = async () => {
    // Optimistically clear the badge for instant feedback.
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await markAllClinicNotificationsRead(supabase);
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  };

  const handleNotificationClick = async (n: RealNotification) => {
    if (!n.is_read) {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === n.id ? { ...item, is_read: true } : item
        )
      );
      try {
        await markSingleNotificationRead(supabase, n.id);
      } catch (err) {
        console.error("Failed to mark notification read:", err);
      }
    }
    setIsNotificationsOpen(false);
    if (n.link_url) router.push(n.link_url);
  };

  const isAdmin = currentUser?.role?.toLowerCase() === "admin";

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
          {isAdmin && urgentAlert && !isAlertDismissed && (
            <div className="p-3 rounded-lg bg-error text-on-error relative shadow-sm text-xs space-y-1">
              <button
                onClick={() => setIsAlertDismissed(true)}
                className="absolute top-1 right-1 p-0.5 hover:bg-black/20 rounded transition"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" /> Urgent Notice
              </div>
              <p className="leading-tight pr-3 text-[11px] opacity-95">{urgentAlert}</p>
            </div>
          )}
          <Button asChild className="w-full bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold py-2 rounded-lg shadow-sm">
            <Link href="/appointments?book=true" className="flex items-center justify-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Record
            </Link>
          </Button>

          {isAdmin && (
            <Link
              href="/settings/tickets"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-surface-container-low text-on-surface-variant text-left transition"
            >
              <TicketCheck className="w-4 h-4 text-outline" /> Ticket Desk
            </Link>
          )}
          <div className="space-y-1 text-xs font-medium text-on-surface-variant">
            <button
              onClick={() => {
                setIsSupportOpen(true);
                setIsHelpOpen(false);
              }}
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
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsProfileMenuOpen(false);
                  setIsHelpOpen(false);
                }}
                className="p-2 text-outline hover:text-on-surface-variant rounded-lg hover:bg-surface-container-low relative transition"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
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
                    {notifications.length === 0 ? (
                      <p className="py-6 text-center text-xs text-on-surface-variant">
                        {notificationsLoaded ? "No notifications yet." : "Loading..."}
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`w-full text-left py-2.5 text-xs space-y-0.5 hover:bg-surface-container-low transition ${n.is_read ? "opacity-70" : ""
                            }`}
                        >
                          <div className="flex items-center justify-between font-semibold text-on-surface">
                            <span>{n.title}</span>
                            {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                          </div>
                          <p className="text-on-surface-variant text-[11px]">{n.body}</p>
                          <span className="text-[10px] text-outline block">{n.timeAgo}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={helpMenuRef}>
              <button
                onClick={() => {
                  setIsHelpOpen((open) => !open);
                  setIsNotificationsOpen(false);
                  setIsProfileMenuOpen(false);
                }}
                className="p-2 text-outline hover:text-on-surface-variant rounded-lg hover:bg-surface-container-low transition"
                aria-label="Help & Resources"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              {/* Help & Resources Popover */}
              {isHelpOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl p-4 z-50">
                  <div className="flex justify-between items-center pb-2.5 border-b border-outline-variant">
                    <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-primary" /> Help & Resources
                    </span>
                    <button
                      onClick={() => setIsHelpOpen(false)}
                      className="text-outline hover:text-on-surface-variant"
                      aria-label="Close help"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Keyboard Shortcuts */}
                  <div className="pt-3 pb-2.5 border-b border-outline-variant">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Keyboard className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Keyboard Shortcuts</span>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { keys: "Ctrl/Cmd + K", action: "Global Search" },
                        { keys: "Shift + A", action: "Quick Book Appointment" },
                        { keys: "Shift + P", action: "Register Patient" },
                        { keys: "Esc", action: "Close Panels" },
                      ].map((s) => (
                        <div key={s.keys} className="flex items-center justify-between">
                          <span className="text-[11px] text-on-surface-variant">{s.action}</span>
                          <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-surface-container-low border border-outline-variant rounded text-outline">
                            {s.keys}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Documentation Links */}
                  <div className="py-2.5 border-b border-outline-variant">
                    <div className="flex items-center gap-1.5 mb-2">
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Documentation</span>
                    </div>
                    <div className="space-y-1">
                      {[
                        "Clinical Workflow Guide",
                        "Billing & Razorpay Reconciliation",
                        "HIPAA / Security Compliance",
                      ].map((link) => (
                        <div
                          key={link}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container-low cursor-pointer transition group"
                        >
                          <span className="text-[11px] font-medium text-on-surface-variant group-hover:text-on-surface transition">
                            {link}
                          </span>
                          <ExternalLink className="w-3 h-3 text-outline group-hover:text-on-surface-variant transition" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Version & Status Footer */}
                  <div className="pt-3 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-outline">VitalSync v1.4.2-prod</span>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                      <CircleCheck className="w-3 h-3" /> All Systems Normal
                    </span>
                  </div>
                </div>
              )}
            </div>

            <span className="text-xs font-medium text-outline">|</span>

            <button
              onClick={() => {
                setIsSupportOpen(true);
                setIsHelpOpen(false);
              }}
              className="text-xs font-medium text-on-surface-variant hover:text-on-surface transition"
            >
              Support
            </button>

            {/* Profile Avatar Trigger + Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => {
                  setIsProfileMenuOpen((open) => !open);
                  setIsNotificationsOpen(false);
                  setIsHelpOpen(false);
                }}
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
                    {isAdmin && (
                      <Link
                        href="/settings/audit-log"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-container-low font-medium text-primary font-semibold"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" /> System Audit Log
                      </Link>
                    )}
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


      {/* Support / Ticket Modal */}
      {isSupportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-outline-variant bg-surface-container-low/50">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-on-surface text-sm">Clinic Support &amp; Incident Desk</h3>
              </div>
              <button
                onClick={() => setIsSupportOpen(false)}
                className="text-outline hover:text-on-surface-variant"
                aria-label="Close support"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Direct Channels */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-outline-variant space-y-1">
                  <div className="font-bold text-on-surface flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-primary" /> Clinical Operations
                  </div>
                  <p className="text-on-surface-variant break-all">support@medflow.clinic</p>
                </div>
                <div className="p-3 rounded-xl border border-outline-variant space-y-1">
                  <div className="font-bold text-on-surface flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary" /> Urgent Clinic Desk
                  </div>
                  <p className="text-on-surface-variant">+91 (800) 492-3829</p>
                  <p className="text-[10px] text-outline">Mon–Sat, 8 AM – 8 PM IST</p>
                </div>
              </div>

              {/* Quick Ticket Form */}
              <div className="space-y-3 p-4 rounded-xl border border-outline-variant bg-surface-container-low/30">
                <div className="font-bold text-on-surface text-xs flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-primary" /> Quick Ticket
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-on-surface-variant" htmlFor="ticket-category">
                      Issue Category
                    </label>
                    <select
                      id="ticket-category"
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value)}
                      className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="billing">Billing &amp; Invoices</option>
                      <option value="appointments">Appointment Scheduling</option>
                      <option value="ehr">EHR / Patient Records</option>
                      <option value="bug">Technical Bug</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-on-surface-variant" htmlFor="ticket-severity">
                      Severity
                    </label>
                    <select
                      id="ticket-severity"
                      value={ticketSeverity}
                      onChange={(e) => setTicketSeverity(e.target.value)}
                      className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="critical">Critical / Clinic Blocker</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-on-surface-variant" htmlFor="ticket-description">
                    Description
                  </label>
                  <textarea
                    id="ticket-description"
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    placeholder="Describe the issue or patient record ID affected..."
                    rows={3}
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary resize-none"
                  />
                </div>

                <Button
                  onClick={() => {
                    if (ticketDescription.trim().length === 0) {
                      toast.error("Please describe the issue before submitting.");
                      return;
                    }
                    const formData = new FormData();
                    formData.set("category", ticketCategory);
                    formData.set("severity", ticketSeverity);
                    formData.set("description", ticketDescription);
                    startTransition(async () => {
                      const result = await submitTicketAction(
                        { success: false, error: null, ticketRef: null },
                        formData
                      );
                      if (result.success && result.ticketRef) {
                        toast.success(
                          `Support ticket ${result.ticketRef} submitted. Our team will reach out to ${currentUser?.email ?? "your email"}.`
                        );
                        setTicketCategory("general");
                        setTicketSeverity("low");
                        setTicketDescription("");
                        setIsSupportOpen(false);
                      } else {
                        toast.error(result.error ?? "Failed to submit ticket.");
                      }
                    });
                  }}
                  disabled={isPending || ticketDescription.trim().length === 0}
                  size="sm"
                  className="w-full bg-primary text-on-primary font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {isPending ? "Submitting..." : "Submit Ticket"}
                </Button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-surface-container-low border-t border-outline-variant flex items-center justify-between">
              <span className="text-[10px] text-outline">MedFlow Clinic Support</span>
              <Button onClick={() => setIsSupportOpen(false)} size="sm" className="bg-primary text-on-primary">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

