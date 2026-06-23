import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { apiServer } from "@/lib/apiClient";
import { AppShell } from "@/app/components/AppShell";
import { CandidateProfileClient } from "./CandidateProfileClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CandidateProfilePage() {
  const session = await getSession();
  if (!session || session.role !== "CANDIDATE") redirect("/login");

  const profileRes = await apiServer("/auth/me", session.token).catch(() => null);
  const profile = profileRes?.ok ? await profileRes.json() : null;

  if (!profile) {
    return (
      <AppShell title="My Profile" subtitle="Unable to load profile">
        <div className="flex items-center justify-center py-12">
          <p className="text-zinc-500">Unable to load profile.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="My Profile" subtitle="Your candidate profile details">
      <div className="max-w-2xl space-y-6">
        <CandidateProfileClient initialProfile={profile} />
      </div>
    </AppShell>
  );
}
