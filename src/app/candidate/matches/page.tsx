import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { apiServer } from "@/lib/apiClient";
import { AppShell } from "@/app/components/AppShell";
import Link from "next/link";
import { Building2, TrendingUp, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CandidateMatchesPage() {
  const session = await getSession();
  if (!session || session.role !== "CANDIDATE") redirect("/login");

  const matchesRes = await apiServer("/candidate/matches", session.token).catch(() => null);
  const matchesData = matchesRes?.ok ? await matchesRes.json() : { matches: [] };
  const matches = matchesData.matches || [];

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case "HIGHLY_RECOMMENDED":
        return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
      case "RECOMMENDED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
      case "CONSIDER":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
      default:
        return "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300";
    }
  };

  const getRecommendationLabel = (rec: string) => {
    switch (rec) {
      case "HIGHLY_RECOMMENDED":
        return "Highly Recommended";
      case "RECOMMENDED":
        return "Recommended";
      case "CONSIDER":
        return "Consider";
      case "NOT_SUITABLE":
        return "Not Suitable";
      default:
        return rec;
    }
  };

  return (
    <AppShell title="My Client Matches" subtitle="See which clients you match with">
      <div className="max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/candidate/dashboard"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>

        {matches.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {matches.map((match: any) => (
              <div
                key={match.clientId}
                className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-lg backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-950/60"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/40">
                      <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        {match.clientName}
                      </h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">{match.jdRole}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getRecommendationColor(
                      match.recommendation
                    )}`}
                  >
                    {getRecommendationLabel(match.recommendation)}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-zinc-500" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Match Score
                      </span>
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {Math.round(match.matchScore * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-200 rounded-full h-2 dark:bg-zinc-800">
                      <div
                        className="bg-blue-600 h-2 rounded-full dark:bg-blue-500"
                        style={{ width: `${match.matchScore * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  Your profile aligns well with this client's requirements. The admin team will review and reach out if there's a good fit.
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-white px-8 py-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
            <Building2 className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              No client matches yet
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Keep your profile updated and complete interviews to improve your matching score.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
