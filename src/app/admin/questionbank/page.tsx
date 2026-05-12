import { AppShell } from "@/app/components/AppShell";
import QuestionBankDashboardClient from "./QuestionBankDashboardClient";

export default function QuestionBankPage() {
  return (
    <AppShell title="Question Bank" subtitle="Manage questions, digest ingestion, and categories.">
      <QuestionBankDashboardClient />
    </AppShell>
  );
}