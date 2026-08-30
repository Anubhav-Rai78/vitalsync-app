"use client";

import React, { useState } from "react";
import { MedFlowLogo } from "@/components/ui/medflow-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, UserCheck, Stethoscope, Lock, Mail } from "lucide-react";
import { loginAction } from "./actions";

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<"standard" | "otp" | "split">("split");
  const [role, setRole] = useState<"doctor" | "admin" | "front_desk">("doctor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      const res = await loginAction({ error: null }, formData);
      if (res && res.error) {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center relative">
      <div className="fixed top-4 right-4 z-50 flex gap-2 bg-surface-container-high p-1.5 rounded-lg border border-outline-variant">
        <button
          onClick={() => setAuthMode("split")}
          className={`px-3 py-1 rounded text-xs font-semibold ${authMode === "split" ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container-low"}`}
        >
          Split Hero
        </button>
        <button
          onClick={() => setAuthMode("standard")}
          className={`px-3 py-1 rounded text-xs font-semibold ${authMode === "standard" ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container-low"}`}
        >
          Direct Form
        </button>
        <button
          onClick={() => setAuthMode("otp")}
          className={`px-3 py-1 rounded text-xs font-semibold ${authMode === "otp" ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container-low"}`}
        >
          MFA / OTP
        </button>
      </div>

      <div className={`w-full ${authMode === "split" ? "grid lg:grid-cols-2 min-h-screen" : "max-w-md mx-auto p-6"}`}>
        <div className="flex flex-col justify-center px-8 lg:px-16 py-12 bg-surface-container-lowest">
          <div className="mb-8">
            <MedFlowLogo size="lg" />
            <h1 className="text-headline-md font-display text-on-surface mt-6">
              Welcome back to MedFlow
            </h1>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Secure clinical workspace and management portal
            </p>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setRole("doctor")}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-semibold transition ${
                role === "doctor"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <Stethoscope className="w-4 h-4 mb-1" />
              Doctor
            </button>
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-semibold transition ${
                role === "admin"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <ShieldCheck className="w-4 h-4 mb-1" />
              Admin
            </button>
            <button
              type="button"
              onClick={() => setRole("front_desk")}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-semibold transition ${
                role === "front_desk"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <UserCheck className="w-4 h-4 mb-1" />
              Staff
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-error-container text-on-error-container text-xs">
              {error}
            </div>
          )}

          {authMode === "otp" ? (
            <div className="space-y-4">
              <label className="text-label-md font-medium text-on-surface block">Enter 6-digit MFA Security Code</label>
              <div className="flex justify-between gap-2">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    className="w-12 h-12 text-center text-lg font-bold border border-outline-variant rounded-lg bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                ))}
              </div>
              <Button className="w-full mt-4" variant="primary">Verify Identity</Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-label-md font-medium text-on-surface block mb-1">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-outline" />
                  <Input
                    type="email"
                    placeholder="doctor@medflow.clinic"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-label-md font-medium text-on-surface block mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-outline" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-body-sm pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-outline-variant text-primary focus:ring-primary" />
                  <span className="text-on-surface-variant">Remember me</span>
                </label>
                <a href="#" className="text-primary font-semibold hover:underline">
                  Forgot Password?
                </a>
              </div>

              <Button type="submit" disabled={loading} className="w-full font-semibold py-2.5 rounded-lg shadow-level-2" variant="primary">
                {loading ? "Signing In..." : "Sign In to Clinic Workspace"}
              </Button>
            </form>
          )}
        </div>

        {authMode === "split" && (
          <div className="hidden lg:flex flex-col justify-between bg-primary p-12 text-white">
            <div className="flex justify-end">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
                v2.4 Production Engine
              </span>
            </div>
            <div className="max-w-md">
              <h2 className="text-display font-display leading-tight mb-4">
                Clinical Precision, Synchronized.
              </h2>
              <p className="text-on-primary-container text-body-md">
                Streamline patient intake, diagnostic prescriptions, multi-practitioner schedules, and automated billing in one HIPAA-compliant clinical infrastructure.
              </p>
            </div>
            <div className="text-xs text-on-primary-container/80">
              © 2026 MedFlow Clinic Management System. All rights reserved.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
