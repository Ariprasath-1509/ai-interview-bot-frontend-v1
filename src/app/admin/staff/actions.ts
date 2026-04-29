"use server";
import { getSession } from "@/lib/session";
import { apiServer } from "@/lib/apiClient";
import { revalidatePath } from "next/cache";

export async function deleteStaffAction(id: string) {
  const session = await getSession();
  if (!session || session.role !== "BENCH_MANAGER") return;

  await apiServer(`/auth/staff/${id}`, session.token, { method: "DELETE" });
  revalidatePath("/admin/staff");
}
