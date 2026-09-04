"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { toast } from "sonner";
import { loginAction } from "@/app/(auth)/login/actions";
import { loginSchema, type LoginPayload } from "@/lib/validators";
import { MedFlowLogo } from "@/components/ui/medflow-logo";

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginPayload>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginPayload) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("email", data.email);
      formData.set("password", data.password);
      const res = await loginAction({ error: null }, formData);
      if (res.error) {
        toast.error(res.error);
      }
    });
  };

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

            <form className="flex flex-col gap-lg" onSubmit={handleSubmit(onSubmit)}>
              <div className="flex flex-col gap-xs">
                <label className="text-label-md text-on-surface" htmlFor="email">
                  Email address
                </label>
                <input
                  className="h-[40px] px-sm bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest focus:border-transparent transition-all text-body-md text-on-surface placeholder-outline"
                  id="email"
                  placeholder="you@medflow.clinic"
                  type="email"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-body-sm text-error">{errors.email.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-xs">
                <div className="flex justify-between items-center">
                  <label className="text-label-md text-on-surface" htmlFor="password">
                    Password
                  </label>
                  <Link className="text-label-md text-primary hover:underline focus:outline-none" href="/forgot-password">
                    Forgot password?
                  </Link>
                </div>
                <input
                  className="h-[40px] px-sm bg-surface-container-low border border-outline-variant rounded focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest focus:border-transparent transition-all text-body-md text-on-surface placeholder-outline"
                  id="password"
                  placeholder="••••••••"
                  type="password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-body-sm text-error">{errors.password.message}</p>
                )}
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
              <button
                className="h-[40px] w-full mt-md bg-primary text-on-primary text-label-md rounded hover:bg-on-primary-fixed-variant transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex items-center justify-center shadow-sm disabled:opacity-60"
                type="submit"
                disabled={isPending}
              >
                {isPending ? "Signing in…" : "Sign In"}
              </button>
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
