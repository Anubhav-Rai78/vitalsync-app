"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/app/(auth)/login/actions";
import { MedFlowLogo } from "@/components/ui/medflow-logo";

const initialState: LoginState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="h-[40px] w-full mt-md bg-primary text-on-primary text-label-md rounded hover:bg-on-primary-fixed-variant transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex items-center justify-center shadow-sm disabled:opacity-60"
      type="submit"
      disabled={pending}
    >
      {pending ? "Signing in…" : "Sign In"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <main className="flex-grow flex w-full">
      <div className="flex flex-col lg:flex-row w-full min-h-screen">
        <div className="w-full lg:w-1/2 flex items-center justify-center p-gutter bg-surface">
          <div className="w-full max-w-[440px] flex flex-col">
            <div className="mb-xxl">
              <MedFlowLogo size="lg" />
            </div>

            <div className="mb-xl">
              <h2 className="text-headline-lg text-on-surface mb-sm">Welcome back</h2>
              <p className="text-body-md text-on-surface-variant">
                Enter your credentials to access your clinic dashboard
              </p>
            </div>

            <form className="flex flex-col gap-lg" action={formAction}>
              {state.error && (
                <div className="rounded-lg bg-error-container text-on-error-container text-body-sm px-sm py-2">
                  {state.error}
                </div>
              )}
              <div className="flex flex-col gap-xs">
                <label className="text-label-md text-on-surface" htmlFor="email">
                  Email address
                </label>
                <input
                  className="h-[40px] px-sm bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest focus:border-transparent transition-all text-body-md text-on-surface placeholder-outline"
                  id="email"
                  name="email"
                  placeholder="you@medflow.clinic"
                  required
                  type="email"
                />
              </div>
              <div className="flex flex-col gap-xs">
                <div className="flex justify-between items-center">
                  <label className="text-label-md text-on-surface" htmlFor="password">
                    Password
                  </label>
                  <Link className="text-label-md text-primary hover:underline focus:outline-none" href="#">
                    Forgot password?
                  </Link>
                </div>
                <input
                  className="h-[40px] px-sm bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest focus:border-transparent transition-all text-body-md text-on-surface placeholder-outline"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  type="password"
                />
              </div>
              <div className="flex items-center gap-sm mt-xs">
                <input
                  className="w-4 h-4 text-primary bg-surface-container-low border-outline-variant rounded focus:ring-primary focus:ring-2 focus:ring-offset-2"
                  id="remember"
                  name="remember"
                  type="checkbox"
                />
                <label className="text-body-sm text-on-surface-variant" htmlFor="remember">
                  Keep me logged in
                </label>
              </div>
              <SubmitButton />
            </form>

            <div className="mt-xl text-center">
              <p className="text-body-sm text-on-surface-variant">
                Don&apos;t have an account?{" "}
                <Link className="text-primary text-label-md hover:underline" href="/register">
                  Register
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex lg:w-1/2 relative bg-surface-container-high border-l border-outline-variant overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center w-full h-full opacity-80"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB8hjZI6tXMrUGBeIf1nwRFYGIzVUIHJ6CO_dsXzekAYX8IY7PL0aBExpwkZgTltn76FCqlJjet4dQGNgf815W3TDgJ8Yfygfnd512rUSQNRZCrm86V0KzUYuv4iQxiCXiMXu2eVyh2ZgZCpbLAA5zalTKovYm3jyivI-OLt0fX59C4joXmm31VYgEVVDCWcECtMKrJsPaNf8yedkurG62KPFEw5nwg5Cp7tRKS4IXGy2Xh1QDyhvoOBg')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-fixed/20 to-surface-container-low/40 mix-blend-multiply" />
        </div>
      </div>
    </main>
  );
}
