"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { resetPasswordAction } from "@/app/actions/auth";
import { Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState(resetPasswordAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="flex justify-center mb-4">
          <Image
            src="/brand360s-darkmodelogo.svg"
            alt="BRAND 360s"
            width={200}
            height={60}
            className="h-12 w-auto object-contain"
            priority
          />
        </div>
        <h2 className="mt-4 text-xl font-bold text-slate-100">
          Create new password
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Choose a secure password with at least 6 characters
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-200">
          <form action={formAction} className="space-y-5">
            {state?.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700">
                {state.error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0481A2] text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0481A2] text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 px-4 bg-[#243E76] hover:bg-[#1B2F5B] text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <span>Save Password & Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

