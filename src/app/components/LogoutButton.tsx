"use client";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/demo/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition-colors duration-150 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
    >
      Sign out
    </button>
  );
}

