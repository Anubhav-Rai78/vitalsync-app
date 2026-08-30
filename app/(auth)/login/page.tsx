"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MedFlowLogo } from "@/components/ui/medflow-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setIsLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <MedFlowLogo size="lg" />
          <h1 className="text-lg font-bold text-slate-900 mt-5">
            Sign in to MedFlow
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Clinical precision workspace and portal
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <Label htmlFor="email">Work Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="name@medflow.clinic"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600">
              <input type="checkbox" className="rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb]" />
              Remember me
            </label>
            <a href="#" className="text-[#2563eb] font-semibold hover:underline">
              Forgot password?
            </a>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-semibold py-2 rounded-lg"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          Need to register a new clinic?{" "}
          <Link href="/register" className="text-[#2563eb] font-semibold hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
