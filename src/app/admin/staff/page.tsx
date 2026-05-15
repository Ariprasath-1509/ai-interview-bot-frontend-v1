import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/AppShell";
import { apiServer } from "@/lib/apiClient";
import { revalidatePath } from "next/cache";
import { StaffDirectoryTable, type StaffRow } from "./StaffDirectoryTable";

export default async function StaffPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/unauthorized");

  const sp = await searchParams;
  const error = sp?.error as string | undefined;

  const res = await apiServer("/auth/staff", session.token);
  const staff = res.ok ? await res.json() : [];

  async function createStaff(formData: FormData) {
    "use server";
    const s = await getSession();
    if (!s || s.role !== "SUPER_ADMIN") return;
    
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");
    const role = formData.get("role");
    const adminSource = formData.get("adminSource") || undefined;

    const body: Record<string, unknown> = { name, email, password, role };
    if (role === "ADMIN" && adminSource) {
      body.adminSource = adminSource;
    }

    const r = await apiServer("/auth/staff", s.token, {
      method: "POST",
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const data = await r.json().catch(() => null);
      const msg = data?.error ?? "Failed to create staff";
      redirect(`/admin/staff?error=${encodeURIComponent(msg)}`);
    }
    revalidatePath("/admin/staff");
    redirect("/admin/staff");
  }

  return (
    <AppShell title="Manage Staff" subtitle="Add or remove staff accounts with appropriate roles.">
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-950 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}
      
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/60">
          <h2 className="font-semibold text-lg mb-4 text-zinc-900 dark:text-zinc-100">Staff Directory</h2>
          <StaffDirectoryTable staff={staff as StaffRow[]} />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/60">
          <h2 className="font-semibold text-lg mb-4 text-zinc-900 dark:text-zinc-100">Add Staff</h2>
          <form action={createStaff} className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Full Name
              <input required name="name" placeholder="Jane Smith" className="input-base" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
              <input required type="email" name="email" placeholder="jane@company.com" className="input-base" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Password
              <input required type="password" minLength={6} name="password" placeholder="Min 6 characters" className="input-base" />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Role
              <select required name="role" className="input-base">
                <option value="RECRUITER">Recruiter</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Admin Source <span className="font-normal text-zinc-400">(required for Admin role)</span>
              <select name="adminSource" className="input-base">
                <option value="">Not applicable</option>
                <option value="BENCH">Bench (manages Bench candidates)</option>
                <option value="BD">BD (manages B2B candidates)</option>
                <option value="RECRUITMENT">Recruitment (manages Market candidates)</option>
              </select>
            </label>
            <button className="mt-4 w-full rounded-lg bg-foreground py-2.5 text-sm font-medium text-background transition-opacity duration-200 hover:opacity-80">
              Create Account
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
