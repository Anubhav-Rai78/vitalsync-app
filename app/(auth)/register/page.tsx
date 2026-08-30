"use client";

import React, { useState } from "react";
import { MedFlowLogo } from "@/components/ui/medflow-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerAction } from "./actions";
import { Building2, User, Mail, Lock, Phone, CheckCircle, ChevronRight, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [clinicName, setClinicName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  
  const [fullName, setFullName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!clinicName || !phoneNumber) {
        setError("Clinic name and phone number are required.");
        return;
      }
      setError(null);
      setStep(2);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName || !workEmail || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("fullName", fullName);
      formData.append("clinicName", clinicName);
      formData.append("workEmail", workEmail);
      formData.append("phoneNumber", phoneNumber);
      formData.append("password", password);
      formData.append("confirmPassword", confirmPassword);
      formData.append("terms", "on"); // automatically agree for workflow
      
      const res = await registerAction({ error: null }, formData);
      if (res && res.error) {
        setError(res.error);
        setLoading(false);
      } else {
        // Go to Step 3 on success
        setStep(3);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <MedFlowLogo size="lg" />
        <h2 className="mt-6 text-center text-headline-md font-display text-on-surface">
          Create your MedFlow Clinic Account
        </h2>
        <p className="mt-2 text-center text-body-sm text-on-surface-variant">
          Complete the multi-step intake to establish your clinic workspace.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        {/* Step Indicator */}
        <div className="mb-6 flex justify-between items-center px-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                step === s
                  ? "bg-primary text-white"
                  : step > s
                  ? "bg-secondary text-white"
                  : "bg-surface-container border border-outline-variant text-on-surface-variant"
              }`}>
                {step > s ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              <span className={`text-xs font-semibold ${step === s ? "text-primary" : "text-on-surface-variant"}`}>
                {s === 1 ? "Clinic Info" : s === 2 ? "Admin Credentials" : "Confirmation"}
              </span>
              {s < 3 && <div className="h-px w-8 bg-outline-variant" />}
            </div>
          ))}
        </div>

        <div className="bg-surface-container-lowest py-8 px-6 shadow-level-2 rounded-xl border border-outline-variant">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-error-container text-on-error-container text-xs">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-4">
              <div>
                <label className="block text-label-md font-medium text-on-surface mb-1">Clinic Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 w-4 h-4 text-outline" />
                  <Input
                    type="text"
                    placeholder="Central Clinic Branch"
                    className="pl-9"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-label-md font-medium text-on-surface mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-outline" />
                  <Input
                    type="tel"
                    placeholder="+1 (555) 019-2834"
                    className="pl-9"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-label-md font-medium text-on-surface mb-1">Clinic Address</label>
                <Input
                  type="text"
                  placeholder="123 Medical Blvd, Suite 100"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full flex items-center justify-center gap-2" variant="primary">
                  Continue to Credentials <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-label-md font-medium text-on-surface mb-1">Lead Admin Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-outline" />
                  <Input
                    type="text"
                    placeholder="Dr. Sarah Jenkins"
                    className="pl-9"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-label-md font-medium text-on-surface mb-1">Work Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-outline" />
                  <Input
                    type="email"
                    placeholder="admin@medflow.clinic"
                    className="pl-9"
                    value={workEmail}
                    onChange={(e) => setWorkEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-label-md font-medium text-on-surface mb-1">Password</label>
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

              <div>
                <label className="block text-label-md font-medium text-on-surface mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-outline" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={() => setStep(1)} className="flex items-center gap-1.5">
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2" variant="primary">
                  {loading ? "Registering..." : "Create Clinic Profile"}
                </Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="text-center py-6 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary-fixed text-secondary mb-2">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-headline-sm font-bold text-on-surface">Registration Complete!</h3>
              <p className="text-body-sm text-on-surface-variant max-w-sm mx-auto">
                Your clinic profile for <strong className="text-on-surface">{clinicName || "MedFlow Clinic"}</strong> has been created. You are registered as the Lead Administrator.
              </p>
              <div className="pt-4">
                <Link href="/dashboard" className="w-full inline-block">
                  <Button className="w-full" variant="primary">
                    Go to Dashboard Console
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
