"use client";

import React, { useState } from "react";
import { MedFlowLogo } from "@/components/ui/medflow-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Mail, Lock, Phone, MapPin, CheckCircle2 } from "lucide-react";

export default function RegisterClinicPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    clinicName: "",
    licenseNumber: "",
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    password: "",
    city: "",
  });

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl border border-outline-variant p-8 shadow-level-3">
        <div className="flex items-center justify-between border-b border-outline-variant pb-6 mb-6">
          <MedFlowLogo size="lg" />
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className={`px-2.5 py-1 rounded-full ${step >= 1 ? "bg-primary text-white" : "bg-surface-container text-outline"}`}>1. Clinic</span>
            <span className="text-outline-variant">→</span>
            <span className={`px-2.5 py-1 rounded-full ${step >= 2 ? "bg-primary text-white" : "bg-surface-container text-outline"}`}>2. Admin</span>
            <span className="text-outline-variant">→</span>
            <span className={`px-2.5 py-1 rounded-full ${step >= 3 ? "bg-primary text-white" : "bg-surface-container text-outline"}`}>3. Confirmation</span>
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-headline-sm font-display text-on-surface">Clinic Details</h2>
            <div>
              <Label>Registered Clinic Name</Label>
              <div className="relative mt-1">
                <Building2 className="absolute left-3 top-3 w-4 h-4 text-outline" />
                <Input
                  className="pl-9"
                  placeholder="Metro City Health Center"
                  value={formData.clinicName}
                  onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Medical License #</Label>
                <Input
                  className="mt-1"
                  placeholder="LIC-993821"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                />
              </div>
              <div>
                <Label>City / Location</Label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-outline" />
                  <Input
                    className="pl-9"
                    placeholder="New Delhi"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <Button onClick={() => setStep(2)} className="w-full mt-4 bg-primary text-white font-semibold">
              Continue to Admin Setup
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-headline-sm font-display text-on-surface">Primary Admin Account</h2>
            <div>
              <Label>Lead Admin Name</Label>
              <Input
                className="mt-1"
                placeholder="Dr. Rajesh Kumar"
                value={formData.adminName}
                onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Admin Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-outline" />
                  <Input
                    className="pl-9"
                    type="email"
                    placeholder="admin@metrohealth.in"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Contact Phone</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-outline" />
                  <Input
                    className="pl-9"
                    placeholder="+91 9876543210"
                    value={formData.adminPhone}
                    onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div>
              <Label>Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-outline" />
                <Input
                  className="pl-9"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" onClick={() => setStep(1)} className="w-1/3">
                Back
              </Button>
              <Button onClick={() => setStep(3)} className="w-2/3 bg-primary text-white font-semibold">
                Register Clinic
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-secondary-fixed text-secondary rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-headline-md font-display text-on-surface">Registration Submitted</h2>
            <p className="text-body-sm text-on-surface-variant max-w-md mx-auto">
              {formData.clinicName} has been registered in the MedFlow network. You can now access your staff dashboard.
            </p>
            <Button asChild className="mt-4 bg-primary text-white">
              <a href="/dashboard">Launch Clinic Dashboard</a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
