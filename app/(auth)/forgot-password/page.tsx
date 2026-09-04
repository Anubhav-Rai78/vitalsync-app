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
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  requestPasswordResetAction,
  type ForgotPasswordState,
} from "./actions";
import {
  forgotPasswordSchema,
  type ForgotPasswordPayload,
} from "@/lib/validators";

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = React.useState<ForgotPasswordState>({
    sent: false,
    error: null,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordPayload>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (data: ForgotPasswordPayload) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("email", data.email);
      const res = await requestPasswordResetAction(
        { sent: false, error: null },
        formData,
      );
      if (res.error) {
        toast.error(res.error);
      }
      setState(res);
    });
  };

  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl border border-outline-variant p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <MedFlowLogo size="lg" />
          <h1 className="text-lg font-bold text-on-surface mt-5">
            Reset your password
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Enter the email associated with your account and we&apos;ll send
            you a link to reset your password.
          </p>
        </div>

        {state.sent ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center py-4 gap-3">
              <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-on-secondary-container" />
              </div>
              <p className="text-sm text-on-surface font-medium">
                Check your email
              </p>
              <p className="text-xs text-on-surface-variant max-w-xs">
                If an account exists for the email you entered, you&apos;ll
                receive a password reset link shortly.
              </p>
            </div>
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-sm text-primary font-semibold hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Label htmlFor="email">Work Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-outline" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@medflow.clinic"
                  className="pl-9"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-error mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-primary hover:bg-primary/90 text-on-primary font-semibold py-2 rounded-lg"
            >
              {isPending ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-outline-variant text-center">
          <Link
            href="/login"
            className="text-sm text-on-surface-variant hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
