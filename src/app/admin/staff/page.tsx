import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/AppShell";
import { apiServer } from "@/lib/apiClient";
import { revalidatePath } from "next/cache";
import { DeleteButton } from "./DeleteButton";

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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Source</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {staff.map((u: any) => (
                  <tr key={u.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                    <td className="py-3 font-medium text-zinc-900 dark:text-zinc-200">{u.name}</td>
                    <td className="py-3 text-zinc-500 dark:text-zinc-400">{u.email}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 text-zinc-500 dark:text-zinc-400 text-xs">
                      {u.adminSource ? (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          u.adminSource === "BENCH" 
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" 
                            : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                        }`}>
                          {u.adminSource}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-3">
                       <DeleteButton id={u.id} />
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500">No staff found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
