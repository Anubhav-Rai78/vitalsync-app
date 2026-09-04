"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MedFlowLogo } from "@/components/ui/medflow-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail } from "lucide-react";
import { useFormState } from "react-dom";
import { loginAction, type LoginState } from "./actions";

const INITIAL_STATE: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, isPending] = useFormState(loginAction, INITIAL_STATE);

  const searchParams = useSearchParams();

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl border border-outline-variant p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <MedFlowLogo size="lg" />
          <h1 className="text-lg font-bold text-on-surface mt-5">
            Sign in to MedFlow
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Clinical precision workspace and portal
          </p>
        </div>

        {state.error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {state.error}
          </div>
        )}

        {searchParams.get("reset") === "success" && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
            Your password has been updated. Please sign in with your new
            password.
          </div>
        )}

        <form className="space-y-4" action={formAction}>
          <div>
            <Label htmlFor="email">Work Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-outline" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@medflow.clinic"
                className="pl-9"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-outline" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-on-surface-variant">
              <input type="checkbox" className="rounded border-outline text-primary focus:ring-primary" />
              Remember me
            </label>
            <a href="/forgot-password" className="text-primary font-semibold hover:underline">
              Forgot password?
            </a>
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-primary hover:bg-primary/90 text-on-primary font-semibold py-2 rounded-lg"
          >
            {isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-outline-variant text-center text-xs text-on-surface-variant">
          Need to register a new clinic?{" "}
          <Link href="/register" className="text-primary font-semibold hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
