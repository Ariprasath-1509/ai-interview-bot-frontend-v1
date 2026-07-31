import type { Session } from "@/lib/session";
import type { FeatureKey } from "@/app/admin/organizations/types";

const GATEWAY = process.env.API_URL ?? "http://localhost:6002";

/** Every feature enabled — used when the fetch fails, so a backend hiccup never hides UI the org is entitled to. */
function allEnabled(): Record<FeatureKey, boolean> {
  return {
    INTERVIEWS: true,
    REVIEW: true,
    SCREENING: true,
    CANDIDATES: true,
    BULK_IMPORT: true,
    DEPLOYMENT_IMPORT: true,
    CLIENTS: true,
    RECRUITER_BOT: true,
    CALENDAR: true,
    COMPLIANCE: true,
    MASTER_DATA: true,
    QUESTION_BANK: true,
    ANALYTICS: true,
  };
}

/** SUPER_ADMIN is cross-org and never feature-gated — every feature stays visible. */
export async function getEnabledFeatures(session: Session | null): Promise<Record<FeatureKey, boolean>> {
  if (!session || session.role === "SUPER_ADMIN") {
    return allEnabled();
  }
  try {
    const res = await fetch(`${GATEWAY}/auth/my-org/features`, {
      headers: {
        Authorization: `Bearer ${session.token}`,
        "X-User-Role": session.role,
      },
      cache: "no-store",
    });
    if (!res.ok) return allEnabled();
    const data = await res.json();
    return data?.features ?? allEnabled();
  } catch {
    return allEnabled();
  }
}
