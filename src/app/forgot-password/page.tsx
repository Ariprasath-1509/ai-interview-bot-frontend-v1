"use client";

import Link from "next/link";
import { useState } from "react";

const inputCls = "input-base";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequestOtp() {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 404) {
          setError("Email not registered. Please check your email or register first.");
        } else {
          setError(data.error || "Failed to send OTP");
        }
        return;
      }

      setSuccess("OTP sent to your email. Please check your inbox.");
      setStep("otp");
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        return;
      }

      setSuccess("Password reset successful! Redirecting to login...");
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-50 px-4 py-8 dark:bg-[#050505] sm:px-6">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[100px] dark:bg-emerald-600/15" />
      <div className="pointer-events-none absolute right-0 top-0 -z-10 h-[400px] w-[400px] -translate-y-1/4 translate-x-1/4 rounded-full bg-sky-500/10 blur-[100px] dark:bg-sky-600/15" />
      <div className="pointer-events-none absolute bottom-0 left-0 -z-10 h-[400px] w-[400px] -translate-x-1/4 translate-y-1/4 rounded-full bg-purple-500/10 blur-[100px] dark:bg-purple-600/15" />

      <main className="z-10 w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-zinc-50">Reset Password</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {step === "email" ? "Enter your email to receive an OTP" : "Enter the OTP sent to your email"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/60">
          {step === "email" ? (
            <div className="grid gap-3">
              <label className="grid gap-1.5 text-sm font-medium">
                Email
                <input
                  className={inputCls}
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </label>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                  {error}
                </p>
              )}

              {success && (
                <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400">
                  {success}
                </p>
              )}

              <button
                className="mt-1 w-full rounded-lg bg-foreground py-2.5 text-sm font-medium text-background transition-opacity duration-200 hover:opacity-80 disabled:opacity-50"
                type="button"
                onClick={handleRequestOtp}
                disabled={loading || !email}
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>

              <p className="text-center text-sm text-zinc-500">
                Remember your password?{" "}
                <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-100">
                  Back to login
                </Link>
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              <label className="grid gap-1.5 text-sm font-medium">
                OTP Code
                <input
                  className={inputCls}
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  disabled={loading}
                />
              </label>

              <label className="grid gap-1.5 text-sm font-medium">
                New Password
                <input
                  className={inputCls}
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
              </label>

              <label className="grid gap-1.5 text-sm font-medium">
                Confirm Password
                <input
                  className={inputCls}
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </label>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                  {error}
                </p>
              )}

              {success && (
                <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-400">
                  {success}
                </p>
              )}

              <button
                className="mt-1 w-full rounded-lg bg-foreground py-2.5 text-sm font-medium text-background transition-opacity duration-200 hover:opacity-80 disabled:opacity-50"
                type="button"
                onClick={handleResetPassword}
                disabled={loading || !otp || !newPassword || !confirmPassword}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>

              <button
                className="text-center text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setError(null);
                  setSuccess(null);
                }}
                disabled={loading}
              >
                ← Back to email
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
