"use client";

import Link from "next/link";
import { useState } from "react";

const inputCls =
  "w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3.5 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#5C0062] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#5C0062] transition-colors";

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

  const btnCls =
    "mt-2 w-full rounded-full bg-[linear-gradient(180deg,#5C0062_0%,#3B0045_50%,#2A0035_100%)] px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-150 hover:opacity-90 disabled:opacity-50 cursor-pointer active:scale-[0.98]";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#15001c] px-6 py-12 lg:px-16">

      <main className="z-10 flex w-full max-w-6xl flex-col items-center justify-between gap-12 lg:flex-row lg:items-center">
        {/* Left Side: White Heading & Hero Text */}
        <div className="flex flex-col justify-center space-y-5 max-w-lg text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#5C0062_0%,#3B0045_50%,#2A0035_100%)] text-white font-black text-sm border border-white/20 shadow-md">
              BR
            </div>
            <span className="text-2xl font-black tracking-tight text-white">BENCH READINESS</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight !text-white uppercase leading-tight" style={{ color: "#ffffff" }}>
            RECOVER ACCOUNT. AMPLIFY QUALITY.
          </h1>

          <p className="text-sm text-purple-100/90 leading-relaxed font-normal">
            Forgot your password? Enter your registered email address to receive a secure OTP and reset your credentials.
          </p>

          <p className="text-base font-extrabold text-white">
            Get. Set. Bench Readiness!
          </p>
        </div>

        {/* Right Side: Reset Password Card */}
        <div className="w-full max-w-sm shrink-0 rounded-2xl border border-white/20 bg-white p-8 shadow-2xl shadow-purple-950/40 text-zinc-900">
          <div className="text-center mb-6">
            <h2 className="text-xl font-extrabold text-zinc-900">Reset Password</h2>
            <p className="mt-1 text-xs text-zinc-500 font-medium">
              {step === "email" ? "Enter your email to receive an OTP" : "Enter the OTP sent to your email"}
            </p>
            <div className="w-8 h-1 bg-[#5C0062] rounded-full mx-auto mt-2" />
          </div>

          {step === "email" ? (
            <div className="grid gap-3">
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">
                <span className="flex items-center gap-1"><span className="text-red-500">*</span> Email</span>
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
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
              )}

              {success && (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 font-semibold">
                  {success}
                </p>
              )}

              <button
                className={btnCls}
                type="button"
                onClick={handleRequestOtp}
                disabled={loading || !email}
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>

              <p className="text-center text-xs text-zinc-500 mt-2">
                Remember your password?{" "}
                <Link href="/login" className="font-semibold text-[#5C0062] underline hover:text-[#3B0045]">
                  Back to login
                </Link>
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">
                <span className="flex items-center gap-1"><span className="text-red-500">*</span> OTP Code</span>
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

              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">
                <span className="flex items-center gap-1"><span className="text-red-500">*</span> New Password</span>
                <input
                  className={inputCls}
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-zinc-700">
                <span className="flex items-center gap-1"><span className="text-red-500">*</span> Confirm Password</span>
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
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
              )}

              {success && (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 font-semibold">
                  {success}
                </p>
              )}

              <button
                className={btnCls}
                type="button"
                onClick={handleResetPassword}
                disabled={loading || !otp || !newPassword || !confirmPassword}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>

              <button
                className="text-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors mt-2"
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
