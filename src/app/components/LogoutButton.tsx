"use client";

import { redirectToLogin } from "@/lib/clientFetch";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    redirectToLogin();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="group w-full rounded-lg bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-rose-500/20 transition-all duration-200 hover:from-rose-600 hover:via-rose-700 hover:to-red-700 hover:shadow-md hover:shadow-rose-500/30 hover:scale-[1.015] active:scale-[0.985] cursor-pointer flex items-center justify-center gap-2"
    >
      <LogOut size={14} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
      <span>Sign out</span>
    </button>
  );
}


