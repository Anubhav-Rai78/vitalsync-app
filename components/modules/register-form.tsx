"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { registerAction, type RegisterState } from "@/app/(auth)/register/actions";
import { MedFlowLogo } from "@/components/ui/medflow-logo";

const initialState: RegisterState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="w-full h-[40px] mt-xl bg-primary-container text-on-primary hover:bg-primary-container/90 transition-colors rounded text-label-md flex justify-center items-center gap-sm disabled:opacity-60"
      type="submit"
      disabled={pending}
    >
      {pending ? "Creating account…" : "Create Account"}
      <span className="material-symbols-outlined text-sm">arrow_forward</span>
    </button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useFormState(registerAction, initialState);

  return (
    <main className="flex-grow flex flex-col md:flex-row w-full min-h-screen">
      <div className="hidden md:flex md:w-1/2 bg-surface-container-highest relative overflow-hidden flex-col justify-between p-xxl border-r border-outline-variant">
        <div className="z-10 relative">
          <div className="flex items-center gap-sm mb-xxl">
            <MedFlowLogo size="lg" />
          </div>
          <h1 className="text-display text-on-surface mb-md max-w-lg">Streamline your clinic&apos;s operations.</h1>
          <p className="text-body-lg text-on-surface-variant max-w-md">
            Join clinics managing patient care with precision, security, and ease.
          </p>
        </div>
        <div className="absolute inset-0 z-0">
          <img
            className="w-full h-full object-cover opacity-60"
            alt=""
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqubCG6_QhYwjLKFOPjm52VdUYRhE-WOUpw3DHPs0bBV5fG5lBgLCXo05FajAb3kt0Kn5qQzShLpEsFKdIVnbi8pNqfJh06jJN57a-VSU3aR1neXRs0RP8GTsL34CRRq0O8ftYCWmd7WqP0beHKZBdEMxbeuEvGm8gO69WJgJNT0YrvOzPzMjroJDWPG7qwhWszQKCYNCQ4527Q3QGMelIrWUrIX3tGJHCIoTPJOdSM0XndXYfTt6bsQ"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-highest via-surface-container-highest/80 to-transparent" />
        </div>
        <div className="z-10 relative">
          <div className="bg-surface/90 backdrop-blur-md p-lg rounded-xl border border-outline-variant max-w-md">
            <p className="text-body-md text-on-surface italic mb-md">
              &quot;MedFlow has transformed how we handle patient records. The intuitive interface saves us hours every week.&quot;
            </p>
            <div className="flex items-center gap-md">
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container text-headline-sm">
                S
              </div>
              <div>
                <p className="text-label-md text-on-surface">Dr. Sarah Jenkins</p>
                <p className="text-body-sm text-on-surface-variant">Chief Medical Officer</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 flex items-center justify-center p-gutter bg-surface">
        <div className="w-full max-w-md">
          <div className="md:hidden flex items-center gap-sm mb-xl justify-center">
            <MedFlowLogo size="lg" />
          </div>
          <div className="mb-xl text-center md:text-left">
            <h2 className="text-headline-lg text-on-surface mb-xs">Create your account</h2>
            <p className="text-body-md text-on-surface-variant">
              Join clinics managing healthcare with precision.
            </p>
          </div>

          <form className="space-y-md" action={formAction}>
            {state.error && (
              <div className="rounded-lg bg-error-container text-on-error-container text-body-sm px-sm py-2">
                {state.error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="space-y-xs">
                <label className="block text-label-md text-on-surface" htmlFor="fullName">
                  Full Name
                </label>
                <input
                  className="w-full h-[40px] px-sm bg-surface-container-lowest border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-body-md text-on-surface placeholder:text-on-surface-variant/50 transition-shadow"
                  id="fullName"
                  name="fullName"
                  placeholder="Dr. Jane Doe"
                  required
                  type="text"
                />
              </div>
              <div className="space-y-xs">
                <label className="block text-label-md text-on-surface" htmlFor="clinicName">
                  Clinic Name
                </label>
                <input
                  className="w-full h-[40px] px-sm bg-surface-container-lowest border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-body-md text-on-surface placeholder:text-on-surface-variant/50 transition-shadow"
                  id="clinicName"
                  name="clinicName"
                  placeholder="Oakwood Medical"
                  type="text"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="space-y-xs">
                <label className="block text-label-md text-on-surface" htmlFor="workEmail">
                  Work Email
                </label>
                <input
                  className="w-full h-[40px] px-sm bg-surface-container-lowest border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-body-md text-on-surface placeholder:text-on-surface-variant/50 transition-shadow"
                  id="workEmail"
                  name="workEmail"
                  placeholder="jane@medflow.clinic"
                  required
                  type="email"
                />
              </div>
              <div className="space-y-xs">
                <label className="block text-label-md text-on-surface" htmlFor="phoneNumber">
                  Phone Number
                </label>
                <input
                  className="w-full h-[40px] px-sm bg-surface-container-lowest border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-body-md text-on-surface placeholder:text-on-surface-variant/50 transition-shadow"
                  id="phoneNumber"
                  name="phoneNumber"
                  placeholder="+91 98765 43210"
                  type="tel"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="space-y-xs">
                <label className="block text-label-md text-on-surface" htmlFor="password">
                  Password
                </label>
                <input
                  className="w-full h-[40px] px-sm bg-surface-container-lowest border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-body-md text-on-surface placeholder:text-on-surface-variant/50 transition-shadow"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  type="password"
                />
              </div>
              <div className="space-y-xs">
                <label className="block text-label-md text-on-surface" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  className="w-full h-[40px] px-sm bg-surface-container-lowest border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-body-md text-on-surface placeholder:text-on-surface-variant/50 transition-shadow"
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="••••••••"
                  required
                  type="password"
                />
              </div>
            </div>

            <div className="flex items-start gap-sm mt-lg">
              <div className="flex items-center h-5">
                <input
                  className="w-4 h-4 text-primary bg-surface-container-lowest border-outline-variant rounded focus:ring-primary focus:ring-2"
                  id="terms"
                  name="terms"
                  type="checkbox"
                />
              </div>
              <div className="text-sm">
                <label className="text-body-sm text-on-surface-variant" htmlFor="terms">
                  I agree to the <Link className="text-primary hover:underline text-label-sm" href="#">Terms of Service</Link>{" "}
                  and <Link className="text-primary hover:underline text-label-sm" href="#">Privacy Policy</Link>.
                </label>
              </div>
            </div>

            <SubmitButton />

            <div className="text-center mt-md">
              <p className="text-body-sm text-on-surface-variant">
                Already have an account?{" "}
                <Link className="text-primary hover:underline text-label-sm" href="/login">
                  Login
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
