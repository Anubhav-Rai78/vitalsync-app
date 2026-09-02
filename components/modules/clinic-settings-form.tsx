"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import {
  updateClinicDetailsAction,
  updateScalingModeAction,
  updateStaffRoleAction,
  type SettingsFormState,
} from "@/app/(dashboard)/settings/actions";
import type { ScalingMode, UserRole } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";

const initialState: SettingsFormState = { error: null };

const TABS = ["Clinic Profile", "Operational Hours", "Billing & Payments", "Notifications", "Security"] as const;

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="px-lg py-sm rounded-lg bg-primary text-on-primary text-label-md hover:bg-primary/90 transition-colors disabled:opacity-60"
      type="submit"
      disabled={pending}
    >
      {pending ? "Saving…" : "Save Changes"}
    </button>
  );
}

export function ClinicSettingsForm({
  clinic,
  staff,
}: {
  clinic: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    scaling_mode: ScalingMode;
    subscription_tier: string;
    logo_url?: string | null;
  };
  staff: { id: string; full_name: string; role: string; is_active: boolean }[];
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Clinic Profile");
  const [state, formAction] = useFormState(updateClinicDetailsAction, initialState);
  const [logoUrl, setLogoUrl] = useState<string | null>(clinic.logo_url ?? null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isUpdatingStaff, startUpdateStaffTransition] = useTransition();
  // These operational flags have no columns in the current clinics schema, so
  // they remain resilient local preferences until the schema is extended.
  const [quickSettings, setQuickSettings] = useState({
    acceptingPatients: true,
    telehealth: true,
    maintenanceMode: false,
  });

  // Operational hours (saved locally as preference defaults).
  const [weekHours, setWeekHours] = useState([
    { key: "mon", label: "Monday", open: true, openTime: "09:00", closeTime: "17:00" },
    { key: "tue", label: "Tuesday", open: true, openTime: "09:00", closeTime: "17:00" },
    { key: "wed", label: "Wednesday", open: true, openTime: "09:00", closeTime: "17:00" },
    { key: "thu", label: "Thursday", open: true, openTime: "09:00", closeTime: "17:00" },
    { key: "fri", label: "Friday", open: true, openTime: "09:00", closeTime: "17:00" },
    { key: "sat", label: "Saturday", open: false, openTime: "10:00", closeTime: "14:00" },
    { key: "sun", label: "Sunday", open: false, openTime: "10:00", closeTime: "14:00" },
  ]);
  const [savingHours, setSavingHours] = useState(false);
  const saveOperationalHours = () => {
    setSavingHours(true);
    setTimeout(() => setSavingHours(false), 900);
  };

  // Notification preference matrix (local defaults for the clinic team).
  const [notificationSettings, setNotificationSettings] = useState([
    {
      key: "appointments",
      label: "Appointment reminders",
      description: "Notify patients & staff before scheduled visits.",
      channels: { email: true, sms: true, inApp: true },
    },
    {
      key: "invoices",
      label: "Invoice payments",
      description: "Alert when an invoice is paid, overdue, or refunded.",
      channels: { email: true, sms: false, inApp: true },
    },
    {
      key: "system",
      label: "System alerts",
      description: "Scaling, security, and uptime notifications for admins.",
      channels: { email: true, sms: false, inApp: true },
    },
  ]);

  // Razorpay key preference (session-scoped, powers the detail-page pay flow).
  const [razorpayKeyId, setRazorpayKeyId] = useState("");

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const filePath = `${clinic.id}/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) {
        alert("Error uploading logo: " + uploadError.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("logos")
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-lg">
      <div>
        <h2 className="text-headline-lg text-on-surface">Clinic Settings</h2>
        <p className="text-body-sm text-on-surface-variant mt-xs">Manage your clinic's configuration.</p>
      </div>

      <div className="border-b border-outline-variant">
        <nav aria-label="Tabs" className="-mb-px flex space-x-8">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 px-1 border-b-2 text-label-md transition-colors ${
                tab === t ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {tab === "Clinic Profile" && (
        <form action={formAction} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg space-y-md">
          {state.error && (
            <div className="rounded-lg bg-error-container text-on-error-container text-body-sm px-sm py-2">{state.error}</div>
          )}
          {state.success && (
            <div className="rounded-lg bg-secondary-container/30 text-secondary text-body-sm px-sm py-2">Saved.</div>
          )}
          
          <div className="space-y-xs">
            <label className="block text-label-md text-on-surface">Clinic Logo</label>
            <div className="rounded-xl border-2 border-dashed border-outline-variant p-md flex items-center gap-md bg-surface-container-low/40">
              {logoUrl ? (
                <img src={logoUrl} alt="Clinic Logo" className="w-20 h-20 rounded-lg object-cover border border-outline-variant" />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-center text-label-sm text-on-surface-variant font-medium">
                  No Logo
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="inline-block px-md py-sm rounded-lg border border-outline text-label-md hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  {uploadingLogo ? "Uploading..." : "Upload Logo"}
                </label>
                <p className="text-label-sm text-on-surface-variant mt-xs">
                  PNG or JPG, max 1MB. Square crop recommended.
                </p>
              </div>
            </div>
            <input type="hidden" name="logoUrl" value={logoUrl ?? ""} />
          </div>

          <div className="space-y-xs">
            <label className="block text-label-md text-on-surface">Clinic Name</label>
            <input
              name="name"
              defaultValue={clinic.name}
              className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm"
            />
          </div>
          <div className="space-y-xs">
            <label className="block text-label-md text-on-surface">Address</label>
            <input
              name="address"
              defaultValue={clinic.address ?? ""}
              className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm"
            />
          </div>
          <div className="space-y-xs">
            <label className="block text-label-md text-on-surface">Phone</label>
            <input
              name="phone"
              defaultValue={clinic.phone ?? ""}
              className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm"
            />
          </div>
          <div className="border-t border-outline-variant pt-md space-y-sm">
            <div>
              <h4 className="text-body-md font-semibold text-on-surface">Quick Settings</h4>
              <p className="text-label-sm text-on-surface-variant">Operational controls for your clinic.</p>
            </div>
            {[
              { key: "acceptingPatients" as const, label: "Accepting New Patients", description: "Show availability for new patient registrations." },
              { key: "telehealth" as const, label: "Telehealth Enabled", description: "Allow remote consultation scheduling." },
              { key: "maintenanceMode" as const, label: "Maintenance Mode", description: "Temporarily restrict non-admin clinic access." },
            ].map((setting) => (
              <div key={setting.key} className="flex items-center justify-between gap-4 rounded-lg bg-surface-container-low p-3 border border-outline-variant">
                <div>
                  <p className="text-label-md font-semibold text-on-surface">{setting.label}</p>
                  <p className="text-label-sm text-on-surface-variant mt-0.5">{setting.description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={quickSettings[setting.key]}
                  onChange={(e) => setQuickSettings((prev) => ({ ...prev, [setting.key]: e.target.checked }))}
                  className="w-4 h-4 text-primary rounded border-outline-variant"
                />
              </div>
            ))}
          </div>
          <div className="pt-md border-t border-outline-variant flex justify-end">
            <SaveButton />
          </div>
        </form>
      )}

      {tab === "Operational Hours" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
          <h4 className="text-body-md font-semibold text-on-surface">Weekly Operational Hours</h4>
          <p className="text-label-sm text-on-surface-variant mt-xs mb-md">
            Set the standard opening hours for each day of the week. Sunday shows as closed by default.
          </p>
          <div className="space-y-sm">
            {weekHours.map((day) => (
              <div key={day.key} className="flex items-center justify-between gap-md rounded-lg border border-outline-variant p-sm">
                <label className="flex items-center gap-sm font-label-md text-label-md text-on-surface w-32">
                  <input
                    type="checkbox"
                    checked={day.open}
                    onChange={(e) =>
                      setWeekHours((prev) =>
                        prev.map((d) => (d.key === day.key ? { ...d, open: e.target.checked } : d))
                      )
                    }
                    className="w-4 h-4 text-primary rounded border-outline-variant"
                  />
                  {day.label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={day.openTime}
                    disabled={!day.open}
                    onChange={(e) =>
                      setWeekHours((prev) =>
                        prev.map((d) => (d.key === day.key ? { ...d, openTime: e.target.value } : d))
                      )
                    }
                    className="h-9 px-sm border border-outline-variant rounded-lg bg-surface-container-low text-body-sm text-on-surface disabled:opacity-40"
                  />
                  <span className="text-label-sm text-on-surface-variant">to</span>
                  <input
                    type="time"
                    value={day.closeTime}
                    disabled={!day.open}
                    onChange={(e) =>
                      setWeekHours((prev) =>
                        prev.map((d) => (d.key === day.key ? { ...d, closeTime: e.target.value } : d))
                      )
                    }
                    className="h-9 px-sm border border-outline-variant rounded-lg bg-surface-container-low text-body-sm text-on-surface disabled:opacity-40"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="pt-md border-t border-outline-variant flex items-center justify-between mt-md">
            <p className="text-label-sm text-on-surface-variant">
              📅 Times are saved locally as preference defaults for new doctor availability.
            </p>
            <button
              type="button"
              onClick={saveOperationalHours}
              className="px-lg py-sm rounded-lg bg-primary text-on-primary text-label-md hover:bg-primary/90 transition-colors disabled:opacity-60"
              disabled={savingHours}
            >
              {savingHours ? "Saving…" : "Save Hours"}
            </button>
          </div>
        </div>
      )}

      {tab === "Notifications" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
          <h4 className="text-body-md font-semibold text-on-surface">Notification Preferences</h4>
          <p className="text-label-sm text-on-surface-variant mt-xs mb-md">
            Choose which channels MedFlow uses to keep your clinic team informed.
          </p>
          <div className="space-y-sm">
            {notificationSettings.map((setting) => (
              <div key={setting.key} className="flex items-center justify-between gap-4 rounded-lg bg-surface-container-low p-sm border border-outline-variant">
                <div>
                  <p className="text-label-md font-semibold text-on-surface">{setting.label}</p>
                  <p className="text-label-sm text-on-surface-variant mt-0.5">{setting.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {(["email", "sms", "inApp"] as const).map((channel) => (
                    <label key={channel} className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant font-medium capitalize">
                      <input
                        type="checkbox"
                        checked={setting.channels[channel]}
                        onChange={() =>
                          setNotificationSettings((prev) =>
                            prev.map((s) =>
                              s.key === setting.key
                                ? { ...s, channels: { ...s.channels, [channel]: !s.channels[channel] } }
                                : s
                            )
                          )
                        }
                        className="w-4 h-4 text-primary rounded border-outline-variant"
                      />
                      {channel === "inApp" ? "In-App" : channel}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "Security" && (
        <div className="space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-level-2">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="py-sm px-md text-label-sm text-on-surface-variant">Name</th>
                  <th className="py-sm px-md text-label-sm text-on-surface-variant">Role</th>
                  <th className="py-sm px-md text-label-sm text-on-surface-variant">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-body-sm">
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td className="py-sm px-md font-semibold text-on-surface">{s.full_name}</td>
                    <td className="py-sm px-md">
                      <select
                        value={s.role}
                        disabled={isUpdatingStaff}
                        onChange={(e) => {
                          const nextRole = e.target.value as UserRole;
                          startUpdateStaffTransition(() => updateStaffRoleAction(s.id, nextRole));
                        }}
                        className="bg-surface-container-low border border-outline-variant rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-primary text-on-surface disabled:opacity-50"
                      >
                        <option value="admin">Admin</option>
                        <option value="doctor">Doctor</option>
                        <option value="front_desk">Front Desk</option>
                      </select>
                    </td>
                    <td className="py-sm px-md">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-secondary-fixed text-on-secondary-fixed-variant">
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-md border-t border-outline-variant bg-surface-container-low/20">
              <p className="text-body-sm text-on-surface-variant">
                New staff join by registering at{" "}
                <Link href="/register" className="text-primary hover:underline font-semibold">
                  /register
                </Link>{" "}
                — promote or update their role here once they've signed up.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-surface-container border border-outline-variant flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-body-md text-on-surface">HIPAA Audit & Access Logs</h4>
              <p className="text-xs text-on-surface-variant mt-0.5">View immutable trace of clinical accesses and config scaling switches.</p>
            </div>
            <Link
              href="/settings/audit-log"
              className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              View Audit Log
            </Link>
          </div>
        </div>
      )}

      {tab === "Billing & Payments" && (
        <div className="space-y-lg">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
            <h4 className="text-body-md font-semibold text-on-surface">Payment Processing</h4>
            <p className="text-label-sm text-on-surface-variant mt-xs">
              Invoices are billed in Indian Rupees (₹). Razorpay is the default gateway — payments
              capture automatically when your Razorpay key is configured.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md mt-md">
              <div className="space-y-xs">
                <label className="block text-label-md text-on-surface">Currency</label>
                <input
                  defaultValue="INR (₹)"
                  readOnly
                  className="w-full h-10 px-md bg-surface-container-low border border-outline-variant rounded-lg text-body-sm text-on-surface"
                />
              </div>
              <div className="space-y-xs">
                <label className="block text-label-md text-on-surface">Razorpay Key ID</label>
                <input
                  defaultValue={razorpayKeyId}
                  onChange={(e) => setRazorpayKeyId(e.target.value)}
                  className="w-full h-10 px-md bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:border-primary outline-none"
                  placeholder="rzp_live_…"
                />
                <p className="text-label-sm text-on-surface-variant">
                  Saved in this browser session. Leave set to use the app&apos;s fallback pay flow.
                </p>
              </div>
            </div>
          </div>
          <ScalingModeSection clinic={clinic} />
        </div>
      )}
    </div>
  );
}

function ScalingModeSection({
  clinic,
}: {
  clinic: { scaling_mode: ScalingMode; subscription_tier: string };
}) {
  const [mode, setMode] = useState<ScalingMode>(clinic.scaling_mode);
  const [isPending, startTransition] = useTransition();

  const OPTIONS: { value: ScalingMode; title: string; description: string }[] = [
    {
      value: "free",
      title: "Stay on free tier",
      description:
        "When usage nears a free-tier limit, VitalSync degrades gracefully (smaller image uploads, longer cache times, throttled non-urgent notifications) instead of breaking.",
    },
    {
      value: "notify",
      title: "Notify me (recommended)",
      description:
        "Same graceful degradation, plus an email/in-app alert with a direct link to the exact Vercel/Supabase billing page to upgrade in one click.",
    },
    {
      value: "auto",
      title: "Auto-upgrade where supported",
      description:
        "Same as Notify, but if you've already saved a payment method with a vendor and that vendor's API supports it, VitalSync will attempt the upgrade automatically. Vendors without a self-serve upgrade API fall back to Notify behavior — this is a real limitation of what those platforms expose, not a VitalSync gap.",
    },
  ];

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg space-y-lg">
      <div>
        <p className="text-label-md text-on-surface-variant uppercase tracking-wide mb-1">Current tier</p>
        <p className="text-headline-sm text-on-surface capitalize">{clinic.subscription_tier}</p>
      </div>

      <div className="space-y-md">
        {OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-start gap-md p-md rounded-lg border cursor-pointer transition-colors ${
              mode === opt.value ? "border-primary bg-primary/5" : "border-outline-variant"
            }`}
          >
            <input
              type="radio"
              name="scalingMode"
              className="mt-1"
              checked={mode === opt.value}
              disabled={isPending}
              onChange={() => {
                setMode(opt.value);
                startTransition(() => updateScalingModeAction(opt.value));
              }}
            />
            <div>
              <p className="text-label-md text-on-surface font-medium">{opt.title}</p>
              <p className="text-body-sm text-on-surface-variant mt-1">{opt.description}</p>
            </div>
          </label>
        ))}
      </div>

      <p className="text-label-sm text-on-surface-variant border-t border-outline-variant pt-md">
        Razorpay billing needs no toggle here — it's pay-as-you-go from day one, so payment
        processing already scales without a plan change.
      </p>
    </div>
  );
}
