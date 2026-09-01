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

  let profileRes = await apiServer("/auth/me", session.token).catch(() => null);
  let profile = profileRes?.ok ? await profileRes.json() : null;

  const candidateId = profile?.id || session.userId;
  if (candidateId) {
    const candidateRes = await apiServer(`/auth/candidates/${candidateId}`, session.token).catch(() => null);
    if (candidateRes?.ok) {
      const candidateData = await candidateRes.json();
      profile = { ...profile, ...candidateData };
    }
  }

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
      <div className="w-full space-y-6">
        <CandidateProfileClient initialProfile={profile} />
      </div>
    </AppShell>
  );
}
