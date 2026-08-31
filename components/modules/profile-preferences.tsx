"use client";

import React, { useState } from "react";
import {
  User,
  Globe,
  Bell,
  Shield,
  CheckCircle2,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/modules/profile-form";
import type { Database } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type Section = "account" | "preferences" | "notifications" | "security";

const NAV: { id: Section; label: string; icon: typeof User }[] = [
  { id: "account", label: "Account Information", icon: User },
  { id: "preferences", label: "Regional Preferences", icon: Globe },
  { id: "notifications", label: "Notification Settings", icon: Bell },
  { id: "security", label: "Security & Sessions", icon: Shield },
];

const CHANNELS = ["In-App", "Email", "SMS"] as const;
const EVENTS = [
  "Appointment reminders",
  "New patient registrations",
  "Invoice payments",
  "System alerts",
  "Prescription updates",
];

export function ProfilePreferences({ profile, email }: { profile: Profile; email: string }) {
  const [section, setSection] = useState<Section>("account");
  const [twoFactor, setTwoFactor] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState("en-IN");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>(() => {
    const init: Record<string, Record<string, boolean>> = {};
    EVENTS.forEach((ev) => {
      init[ev] = { "In-App": true, Email: true, SMS: ev === "Appointment reminders" };
    });
    return init;
  });
  const [saved, setSaved] = useState<string | null>(null);

  const toggleChannel = (event: string, channel: string) => {
    setMatrix((prev) => ({
      ...prev,
      [event]: { ...prev[event], [channel]: !prev[event][channel] },
    }));
  };

  const persistPrefs = () => {
    setSaved("Preferences saved locally.");
    setTimeout(() => setSaved(null), 2500);
  };

  return (
    <div className="space-y-lg max-w-4xl">
      {/* Profile summary header */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-5">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} className="w-20 h-20 rounded-full object-cover border-2 border-primary/20 shadow-sm" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary-container/20 text-primary flex items-center justify-center font-bold text-2xl border-2 border-primary/20 shadow-sm">
              {profile.full_name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-headline-md text-on-surface">{profile.full_name}</h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5 capitalize">
              {profile.role.replace("_", " ")}{profile.specialty ? ` • ${profile.specialty}` : ""}
              {profile.license_no ? ` • ID: ${profile.license_no}` : ""}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setSection("account")}>Edit Profile</Button>
      </div>

      {saved && (
        <div className="rounded-lg bg-secondary-container/30 text-secondary text-body-sm px-3 py-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {saved}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left nav */}
        <div className="space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-body-sm font-semibold transition ${
                  section === item.id
                    ? "bg-primary-container/20 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-low text-left"
                }`}
              >
                <Icon className="w-4 h-4" /> {item.label}
              </button>
            );
          })}
        </div>

        {/* Right content */}
        <div className="lg:col-span-2 space-y-6">
          {section === "account" && <ProfileForm profile={profile} email={email} />}

          {section === "preferences" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4 text-body-sm">
              <h3 className="text-headline-sm text-on-surface border-b border-outline-variant pb-2">Regional Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-on-surface block mb-1">Language</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full h-10 px-3 border border-outline-variant rounded-lg outline-none bg-surface-container-lowest focus:border-primary">
                    <option value="en-IN">English (India)</option>
                    <option value="hi-IN">Hindi</option>
                    <option value="en-US">English (US)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-on-surface block mb-1">Timezone</label>
                  <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full h-10 px-3 border border-outline-variant rounded-lg outline-none bg-surface-container-lowest focus:border-primary">
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                <div className="flex items-center gap-2">
                  {darkMode ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
                  <div>
                    <p className="font-semibold text-on-surface">Dark Mode</p>
                    <p className="text-label-sm text-on-surface-variant">Switch the console to a dark theme.</p>
                  </div>
                </div>
                <input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} className="w-4 h-4 text-primary rounded border-outline-variant" />
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={persistPrefs}>Save Preferences</Button>
              </div>
            </div>
          )}

          {section === "notifications" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4 text-body-sm">
              <h3 className="text-headline-sm text-on-surface border-b border-outline-variant pb-2">Notification Channel Matrix</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-label-sm text-on-surface-variant uppercase font-semibold">
                    <tr>
                      <th className="py-2 pr-4">Event</th>
                      {CHANNELS.map((c) => (
                        <th key={c} className="py-2 px-3 text-center">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {EVENTS.map((ev) => (
                      <tr key={ev}>
                        <td className="py-2.5 pr-4 font-medium text-on-surface">{ev}</td>
                        {CHANNELS.map((c) => (
                          <td key={c} className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={matrix[ev]?.[c] ?? false}
                              onChange={() => toggleChannel(ev, c)}
                              className="w-4 h-4 text-primary rounded border-outline-variant"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={persistPrefs}>Save Notifications</Button>
              </div>
            </div>
          )}

          {section === "security" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4 text-body-sm">
              <h3 className="text-headline-sm text-on-surface border-b border-outline-variant pb-2">Account Security &amp; 2FA</h3>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                <div>
                  <p className="font-bold text-on-surface">Two-Factor Authentication (2FA)</p>
                  <p className="text-label-sm text-on-surface-variant">Add an extra layer of security to your account.</p>
                </div>
                <input type="checkbox" checked={twoFactor} onChange={(e) => setTwoFactor(e.target.checked)} className="w-4 h-4 text-primary rounded border-outline-variant" />
              </div>
              <div>
                <p className="font-semibold text-on-surface mb-2">Active Sessions</p>
                <div className="rounded-lg border border-outline-variant p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-on-surface">This device • Chrome on Linux</p>
                    <p className="text-label-sm text-on-surface-variant">Last active just now</p>
                  </div>
                  <span className="text-label-sm font-semibold text-secondary">Current</span>
                </div>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={persistPrefs}>Save Security</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
