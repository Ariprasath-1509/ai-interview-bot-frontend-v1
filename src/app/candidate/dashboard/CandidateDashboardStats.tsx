"use client";

import { StatCard } from "@/components/common/AppUi";
import { Calendar, CheckCircle2 } from "lucide-react";

export function CandidateDashboardStats({
  upcoming,
  completed,
}: {
  upcoming: number;
  completed: number;
}) {
  return (
    <>
      <StatCard title="Upcoming" value={upcoming} accent="blue" icon={Calendar} />
      <StatCard title="Completed" value={completed} accent="emerald" icon={CheckCircle2} />
    </>
  );
}
