"use server";
import { getSession } from "@/lib/session";
import { apiServer } from "@/lib/apiClient";
import { revalidatePath } from "next/cache";

type UpdateStaffInput = {
  name: string;
  email: string;
  password?: string;
  role: string;
  adminSource?: string;
  branch?: string;
};

export async function updateStaffAction(
  id: string,
  input: UpdateStaffInput
): Promise<{ error?: string } | void> {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
    return { error: "Unauthorized" };
  }

  const body: Record<string, string> = {
    name: input.name.trim(),
    email: input.email.trim(),
    role: input.role,
  };
  if (input.password?.trim()) {
    body.password = input.password;
  }
  if (input.adminSource !== undefined) {
    body.adminSource = input.adminSource.trim();
  }
  if (input.branch !== undefined && input.branch.trim()) {
    body.branch = input.branch.trim();
  }

  try {
    const res = await apiServer(`/auth/staff/${id}`, session.token, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      return { error: data?.error ?? "Failed to update staff member" };
    }
    revalidatePath("/admin/staff");
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update staff member";
    return { error: message };
  }
}

export async function createStaffAction(input: {
  name: string;
  email: string;
  password?: string;
  role: string;
  branch: string;
  adminSource?: string;
}): Promise<{ error?: string } | void> {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) {
    return { error: "Unauthorized" };
  }

  const baseRole = input.role || "RECRUITER";
  const branch = input.branch || "DEVELOPMENT";
  const isTesting = branch.toUpperCase() === "TESTING";
  const role =
    baseRole === "ADMIN"
      ? isTesting
        ? "TESTING_ADMIN"
        : "ADMIN"
      : isTesting
      ? "TESTING_RECRUITER"
      : "RECRUITER";

  const body: Record<string, unknown> = {
    name: input.name.trim(),
    email: input.email.trim(),
    password: input.password,
    role,
    branch,
  };
  if ((role === "ADMIN" || role === "TESTING_ADMIN") && input.adminSource) {
    body.adminSource = input.adminSource.trim();
  }

  try {
    const res = await apiServer("/auth/staff", session.token, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      return { error: data?.error ?? "Failed to create staff member" };
    }
    revalidatePath("/admin/staff");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create staff member";
    return { error: message };
  }
}

export async function deleteStaffAction(id: string) {
  const session = await getSession();
  if (!session || (session.role !== "SUPER_ADMIN" && session.role !== "ADMIN")) return;

  await apiServer(`/auth/staff/${id}`, session.token, { method: "DELETE" });
  revalidatePath("/admin/staff");
}

