"use client";

import { useActionState, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/dashboard";

  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="returnUrl" value={returnUrl} />

      {state?.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700 flex items-center gap-2">
          <span>{state.error}</span>
        </div>
      )}

      {/* Email Field */}
      <div>
        <label
          htmlFor="email"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
        >
          Email address
        </label>
        <div className="relative rounded-lg shadow-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Mail size={16} />
          </div>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="admin@brand360s.com"
            className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#077EA1]/20 focus:border-[#077EA1] placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Password Field */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
          >
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-[#077EA1] hover:text-[#066B89] hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative rounded-lg shadow-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Lock size={16} />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="block w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#077EA1]/20 focus:border-[#077EA1] placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#077EA1] hover:bg-[#066B89] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#077EA1] transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Signing in...</span>
          </>
        ) : (
          <>
            <span>Sign In</span>
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle brand glow background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#077EA1]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* Brand Logo */}
        <div className="inline-flex items-center space-x-2 font-black tracking-tight text-3xl">
          <span className="text-white">BRAND</span>
          <span className="text-[#00A3C4]">360s</span>
          <span className="text-[10px] uppercase font-bold tracking-widest bg-[#243E76] text-white px-2 py-0.5 rounded ml-2 border border-blue-400/30">
            CRM
          </span>
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-100">
          Sign in to your account
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Internal portal for Admin & Sales Executives
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-200">
          <Suspense fallback={<div className="py-8 text-center text-xs text-slate-400">Loading form...</div>}>
            <LoginForm />
          </Suspense>
        </div>

        {/* Security badge footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          BRAND 360s CRM &copy; {new Date().getFullYear()} • Restricted Access
        </p>
      </div>
    </div>
  );
}
