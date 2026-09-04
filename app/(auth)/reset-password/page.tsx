"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { MedFlowLogo } from "@/components/ui/medflow-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import {
  updatePasswordAction,
  type ResetPasswordState,
} from "./actions";
import {
  resetPasswordSchema,
  type ResetPasswordPayload,
} from "@/lib/validators";

export default function ResetPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordPayload>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = (data: ResetPasswordPayload) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("password", data.password);
      formData.set("confirmPassword", data.confirmPassword);
      const res = await updatePasswordAction({ error: null }, formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        setSubmitted(true);
      }
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-surface-container-low flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl border border-outline-variant p-8 shadow-sm text-center">
          <MedFlowLogo size="lg" />
          <h1 className="text-lg font-bold text-on-surface mt-5">
            Password updated
          </h1>
          <p className="text-xs text-on-surface-variant mt-1 mb-6">
            Your password has been changed successfully. You can now sign in
            with your new password.
          </p>
          <Link
            href="/login?reset=success"
            className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl border border-outline-variant p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <MedFlowLogo size="lg" />
          <h1 className="text-lg font-bold text-on-surface mt-5">
            Set a new password
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Create a strong password for your account.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Label htmlFor="password">New Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-outline" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-9 pr-9"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-3 text-outline hover:text-on-surface transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-error mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-outline" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-9"
                {...register("confirmPassword")}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-error mt-1">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-primary hover:bg-primary/90 text-on-primary font-semibold py-2 rounded-lg"
          >
            {isPending ? "Updating..." : "Update Password"}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-outline-variant text-center">
          <Link
            href="/forgot-password"
            className="text-sm text-on-surface-variant hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Request a new reset link
          </Link>
        </div>
      </div>
    </div>
  );
}
